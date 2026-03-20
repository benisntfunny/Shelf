#!/usr/bin/env swift

// Xeneon Edge Touch Remapper v3
// Uses IOHIDDeviceRegisterInputValueCallback instead of raw reports.
// This receives parsed HID element values alongside macOS, without needing seize.

import Foundation
import IOKit
import IOKit.hid
import CoreGraphics

// MARK: - Configuration

let TOUCH_VID: Int = 0x27C0
let TOUCH_PID: Int = 0x0859

var displayX: CGFloat = 0
var displayY: CGFloat = 0
var displayW: CGFloat = 1280
var displayH: CGFloat = 360

// MARK: - Touch State

var tipSwitch = false
var touchX: Int = 0
var touchY: Int = 0
var touchMaxX: Int = 2560  // will be updated from element logical max
var touchMaxY: Int = 720
var wasTouching = false
var lastScreenPt = CGPoint.zero
var debugCount = 0

// MARK: - Display Detection

func autoDetectDisplay() -> Bool {
    let maxDisplays: UInt32 = 16
    var displays = [CGDirectDisplayID](repeating: 0, count: Int(maxDisplays))
    var count: UInt32 = 0
    CGGetActiveDisplayList(maxDisplays, &displays, &count)
    for i in 0..<Int(count) {
        let b = CGDisplayBounds(displays[i])
        let w = Int(b.width), h = Int(b.height)
        if (w == 1280 && h == 360) || (w == 2560 && h == 720) {
            displayX = b.origin.x; displayY = b.origin.y
            displayW = b.width; displayH = b.height
            log("Auto-detected Xeneon at (\(displayX),\(displayY)) \(displayW)x\(displayH)")
            return true
        }
    }
    return false
}

func log(_ msg: String) {
    FileHandle.standardError.write("[touch-remap] \(msg)\n".data(using: .utf8)!)
}

// MARK: - Mouse Events

func postMouse(_ type: CGEventType, at pt: CGPoint) {
    guard let ev = CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: pt, mouseButton: .left) else { return }
    ev.post(tap: .cghidEventTap)
}

func commitTouch() {
    let normX = Double(touchX) / Double(max(touchMaxX, 1))
    let normY = Double(touchY) / Double(max(touchMaxY, 1))
    let screenX = displayX + CGFloat(normX) * displayW
    let screenY = displayY + CGFloat(normY) * displayH
    let pt = CGPoint(x: screenX, y: screenY)

    if tipSwitch && !wasTouching {
        postMouse(.leftMouseDown, at: pt)
    } else if tipSwitch && wasTouching {
        postMouse(.leftMouseDragged, at: pt)
    } else if !tipSwitch && wasTouching {
        postMouse(.leftMouseUp, at: lastScreenPt)
    }

    if tipSwitch { lastScreenPt = pt }
    wasTouching = tipSwitch
}

// MARK: - HID Value Callback

func valueCallback(context: UnsafeMutableRawPointer?,
                   result: IOReturn,
                   sender: UnsafeMutableRawPointer?,
                   value: IOHIDValue) {
    let element = IOHIDValueGetElement(value)
    let usagePage = IOHIDElementGetUsagePage(element)
    let usage = IOHIDElementGetUsage(element)
    let intVal = IOHIDValueGetIntegerValue(value)

    if debugCount < 100 {
        log("VALUE usagePage=0x\(String(format:"%X",usagePage)) usage=0x\(String(format:"%X",usage)) val=\(intVal)")
        debugCount += 1
    }

    switch usagePage {
    case 0x0D: // Digitizer
        switch usage {
        case 0x42: // Tip Switch
            tipSwitch = (intVal != 0)
            commitTouch()
        case 0x47: // Confidence
            break
        case 0x48: // Width
            break
        case 0x49: // Height
            break
        case 0x51: // Contact ID
            break
        case 0x54: // Contact Count
            break
        default:
            break
        }
    case 0x01: // Generic Desktop
        switch usage {
        case 0x30: // X
            let logMax = IOHIDElementGetLogicalMax(element)
            if logMax > 0 { touchMaxX = logMax }
            touchX = intVal
        case 0x31: // Y
            let logMax = IOHIDElementGetLogicalMax(element)
            if logMax > 0 { touchMaxY = logMax }
            touchY = intVal
        default:
            break
        }
    default:
        break
    }
}

// MARK: - Main

func main() {
    setbuf(stdout, nil)
    log("Xeneon Edge Touch Remapper v3 starting")

    let args = CommandLine.arguments
    if args.count >= 5 {
        displayX = CGFloat(Double(args[1]) ?? 0)
        displayY = CGFloat(Double(args[2]) ?? 0)
        displayW = CGFloat(Double(args[3]) ?? 1280)
        displayH = CGFloat(Double(args[4]) ?? 360)
        log("Display bounds: (\(displayX),\(displayY)) \(displayW)x\(displayH)")
    } else if !autoDetectDisplay() {
        log("WARNING: Could not auto-detect Xeneon display")
    }

    guard let manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone)) as IOHIDManager? else {
        log("ERROR: Cannot create HID manager"); exit(1)
    }

    // Match ALL interfaces of this device
    let match: [String: Any] = [
        kIOHIDVendorIDKey as String: TOUCH_VID,
        kIOHIDProductIDKey as String: TOUCH_PID,
    ]
    IOHIDManagerSetDeviceMatching(manager, match as CFDictionary)

    // Try seize first (blocks macOS from also processing events)
    var openResult = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeSeizeDevice))
    if openResult != kIOReturnSuccess {
        log("Seize failed (0x\(String(format:"%08X",openResult))), opening normally")
        openResult = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        if openResult != kIOReturnSuccess {
            log("ERROR: Cannot open HID manager: 0x\(String(format:"%08X",openResult))")
            exit(1)
        }
        log("Opened without seize — touch events will also go to macOS primary display")
    } else {
        log("Seized touchscreen successfully — exclusive control")
    }

    guard let devices = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>, !devices.isEmpty else {
        log("ERROR: No touchscreen devices found"); exit(1)
    }

    log("Found \(devices.count) interface(s)")

    // Register value callback on the manager (covers all matched devices)
    IOHIDManagerRegisterInputValueCallback(manager, valueCallback, nil)
    IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetCurrent(), CFRunLoopMode.defaultMode.rawValue)

    for dev in devices {
        let usagePage = IOHIDDeviceGetProperty(dev, kIOHIDPrimaryUsagePageKey as CFString) as? Int ?? 0
        let usage = IOHIDDeviceGetProperty(dev, kIOHIDPrimaryUsageKey as CFString) as? Int ?? 0
        let maxInput = IOHIDDeviceGetProperty(dev, kIOHIDMaxInputReportSizeKey as CFString) as? Int ?? 0
        log("  usagePage=0x\(String(format:"%X",usagePage)) usage=0x\(String(format:"%X",usage)) maxInput=\(maxInput)")
    }

    log("Listening for touch events...")
    print("READY")
    fflush(stdout)

    CFRunLoopRun()
}

main()
