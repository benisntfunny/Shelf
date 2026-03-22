{
  "targets": [
    {
      "target_name": "touch_remap",
      "sources": ["touch_remap.mm"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "xcode_settings": {
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17", "-ObjC++"],
        "OTHER_LDFLAGS": [
          "-framework CoreGraphics",
          "-framework CoreFoundation",
          "-framework ApplicationServices"
        ]
      }
    }
  ]
}
