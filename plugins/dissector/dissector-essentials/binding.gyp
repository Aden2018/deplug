{
  "target_defaults":{
    "include_dirs":[
      "<!(node -e \"require('nan')\")",
      "<!(node -e \"require('../../../node_modules/plugkit/include')\")"
    ],
    "conditions":[
      [
        "OS=='mac'",
        {
          "xcode_settings":{
            "MACOSX_DEPLOYMENT_TARGET":"10.9"
          }
        }
      ],
      [
        "OS=='win'",
        {
          "configurations":{
            "Release":{
              "msbuild_settings":{
                "Link":{
                  "AdditionalDependencies":[
                    "\"../../../../node_modules/plugkit/build/Release/plugkit.lib\""
                  ]
                }
              }
            }
          }
        }
      ]
    ]
  },
  "targets":[
    {
      "target_name":"ethernet",
      "sources":[
        "eth.cpp"
      ]
    },
    {
      "target_name":"ipv4",
      "sources":[
        "ipv4.cpp"
      ]
    },
    {
      "target_name":"ipv6",
      "sources":[
        "ipv6.cpp"
      ]
    },
    {
      "target_name":"udp",
      "sources":[
        "udp.cpp"
      ]
    },
    {
      "target_name":"tcp",
      "sources":[
        "tcp.cpp"
      ]
    },
    {
      "target_name":"tcp-stream",
      "sources":[
        "tcp-stream.cpp"
      ]
    }
  ]
}
