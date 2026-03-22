#include <napi.h>
#include <CoreGraphics/CoreGraphics.h>
#include <CoreFoundation/CoreFoundation.h>
#include <thread>
#include <atomic>
#include <cstdio>
#include <cmath>

// --- State ---
static std::thread tapThread;
static std::atomic<bool> running{false};
static std::atomic<CFRunLoopRef> tapRunLoop{nullptr};
static CFMachPortRef eventTap = nullptr;

// Display parameters
static CGFloat primaryW = 2560, primaryH = 1440;
static CGFloat xeneonX = 0, xeneonY = 1440, xeneonW = 2560, xeneonH = 720;

// Touch detection: track cursor position to detect teleports
static CGPoint lastCursorPos = {-1, -1};
static bool cursorTracked = false;
static const CGFloat jumpThreshold = 10.0;

// Digitizer event confirmation
static CFAbsoluteTime touchActiveUntil = 0;
static const CFTimeInterval touchWindow = 2.0;

static int debugCount = 0;

// Raw digitizer event types
static const CGEventType kDigitizerDown = (CGEventType)10;
static const CGEventType kDigitizerUp = (CGEventType)11;

static FILE* logFile = nullptr;

static void logMsg(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    fprintf(stderr, "[touch-remap] ");
    vfprintf(stderr, fmt, args);
    fprintf(stderr, "\n");
    va_end(args);

    if (!logFile) {
        logFile = fopen("/tmp/shelf-touch-remap.log", "a");
    }
    if (logFile) {
        fprintf(logFile, "[touch-remap] ");
        va_list args2;
        va_start(args2, fmt);
        vfprintf(logFile, fmt, args2);
        va_end(args2);
        fprintf(logFile, "\n");
        fflush(logFile);
    }
}

static CGPoint remap(CGPoint loc) {
    CGFloat normX = loc.x / primaryW;
    CGFloat normY = loc.y / primaryH;
    return CGPointMake(xeneonX + normX * xeneonW, xeneonY + normY * xeneonH);
}

static bool isCursorJump(CGPoint loc) {
    if (!cursorTracked) return false;
    CGFloat dx = loc.x - lastCursorPos.x;
    CGFloat dy = loc.y - lastCursorPos.y;
    return (fabs(dx) > jumpThreshold || fabs(dy) > jumpThreshold);
}

static CGEventRef tapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon) {
    if (type == kCGEventTapDisabledByTimeout || type == kCGEventTapDisabledByUserInput) {
        logMsg("Tap re-enabled");
        if (eventTap) CGEventTapEnable(eventTap, true);
        return event;
    }

    CFAbsoluteTime now = CFAbsoluteTimeGetCurrent();

    // Digitizer events (type 10/11) — only from touchscreen
    if (type == kDigitizerDown || type == kDigitizerUp) {
        touchActiveUntil = now + touchWindow;
        return event;
    }

    // Track cursor position from real mouse movement
    if (type == kCGEventMouseMoved) {
        double dx = CGEventGetDoubleValueField(event, kCGMouseEventDeltaX);
        double dy = CGEventGetDoubleValueField(event, kCGMouseEventDeltaY);
        CGPoint loc = CGEventGetLocation(event);

        if (fabs(dx) > 0.001 || fabs(dy) > 0.001) {
            // Real mouse movement — update tracked position and clear touch window
            lastCursorPos = loc;
            cursorTracked = true;
            touchActiveUntil = 0;
        }
        return event;
    }

    // Skip non-mouse events
    bool isClickEvent = (type == kCGEventLeftMouseDown || type == kCGEventLeftMouseUp ||
                         type == kCGEventLeftMouseDragged);
    bool isScroll = (type == kCGEventScrollWheel);

    if (!isClickEvent && !isScroll) return event;

    // scrollWheel — pass through (don't remap to avoid issues)
    if (isScroll) return event;

    // Click events: detect touch by cursor jump OR active touch window
    CGPoint loc = CGEventGetLocation(event);

    // Already in Xeneon area (from a prior warp) — don't double-remap
    if (loc.y >= xeneonY) return event;

    double dx = CGEventGetDoubleValueField(event, kCGMouseEventDeltaX);
    double dy = CGEventGetDoubleValueField(event, kCGMouseEventDeltaY);
    bool isZeroDelta = fabs(dx) < 0.001 && fabs(dy) < 0.001;
    bool isTouchActive = now < touchActiveUntil;
    bool jumped = isCursorJump(loc);

    bool isTouch = isZeroDelta && (jumped || isTouchActive);

    if (debugCount < 200 && (type == kCGEventLeftMouseDown || type == kCGEventLeftMouseUp)) {
        logMsg("CLICK type=%d loc=(%.0f,%.0f) jumped=%d touchActive=%d isTouch=%d",
               (int)type, loc.x, loc.y, jumped, isTouchActive, isTouch);
        debugCount++;
    }

    if (isTouch) {
        CGPoint newLoc = remap(loc);
        if (debugCount < 200) {
            logMsg("REMAP (%.0f,%.0f) -> (%.0f,%.0f)", loc.x, loc.y, newLoc.x, newLoc.y);
            debugCount++;
        }

        CGWarpMouseCursorPosition(newLoc);
        CGEventSetLocation(event, newLoc);
        touchActiveUntil = now + touchWindow;
    } else {
        // Real mouse click — update cursor position
        lastCursorPos = loc;
        cursorTracked = true;
    }

    return event;
}

static void tapThreadFunc() {
    CGEventMask mask = kCGEventMaskForAllEvents;

    eventTap = CGEventTapCreate(
        kCGHIDEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        mask,
        tapCallback,
        nullptr
    );

    if (!eventTap) {
        logMsg("ERROR: Cannot create event tap — check Accessibility permission");
        running = false;
        return;
    }

    CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
    CFRunLoopRef rl = CFRunLoopGetCurrent();
    tapRunLoop.store(rl);
    CFRunLoopAddSource(rl, runLoopSource, kCFRunLoopCommonModes);
    CGEventTapEnable(eventTap, true);

    bool enabled = CGEventTapIsEnabled(eventTap);
    logMsg("Active — remapping touch events (tap enabled=%d)", enabled);
    CFRunLoopRun();

    CGEventTapEnable(eventTap, false);
    CFRunLoopRemoveSource(rl, runLoopSource, kCFRunLoopCommonModes);
    CFRelease(runLoopSource);
    CFRelease(eventTap);
    eventTap = nullptr;
    tapRunLoop.store(nullptr);
    logMsg("Stopped");
}

// --- N-API exports ---

Napi::Value Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (running) {
        Napi::Error::New(env, "Touch remapper is already running").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    if (info.Length() < 6) {
        Napi::TypeError::New(env, "Expected 6 arguments: primaryW, primaryH, xeneonX, xeneonY, xeneonW, xeneonH").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    primaryW = info[0].As<Napi::Number>().DoubleValue();
    primaryH = info[1].As<Napi::Number>().DoubleValue();
    xeneonX = info[2].As<Napi::Number>().DoubleValue();
    xeneonY = info[3].As<Napi::Number>().DoubleValue();
    xeneonW = info[4].As<Napi::Number>().DoubleValue();
    xeneonH = info[5].As<Napi::Number>().DoubleValue();
    debugCount = 0;
    cursorTracked = false;
    lastCursorPos = {-1, -1};
    touchActiveUntil = 0;

    logMsg("Starting with primary=%.0fx%.0f xeneon=(%.0f,%.0f) %.0fx%.0f",
           primaryW, primaryH, xeneonX, xeneonY, xeneonW, xeneonH);

    running = true;
    tapThread = std::thread(tapThreadFunc);

    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    if (!running) {
        if (tapThread.joinable()) tapThread.join();
        Napi::Error::New(env, "Cannot create event tap — grant Accessibility permission to Shelf.app in System Settings > Privacy & Security > Accessibility").ThrowAsJavaScriptException();
        return env.Undefined();
    }

    return env.Undefined();
}

Napi::Value Stop(const Napi::CallbackInfo& info) {
    if (!running) return info.Env().Undefined();

    running = false;
    CFRunLoopRef rl = tapRunLoop.load();
    if (rl) {
        CFRunLoopStop(rl);
    }
    if (tapThread.joinable()) {
        tapThread.join();
    }
    logMsg("Cleaned up");
    return info.Env().Undefined();
}

Napi::Value IsRunning(const Napi::CallbackInfo& info) {
    return Napi::Boolean::New(info.Env(), running.load());
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("start", Napi::Function::New(env, Start));
    exports.Set("stop", Napi::Function::New(env, Stop));
    exports.Set("isRunning", Napi::Function::New(env, IsRunning));
    return exports;
}

NODE_API_MODULE(touch_remap, Init)
