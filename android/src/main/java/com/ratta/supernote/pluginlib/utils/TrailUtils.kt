package com.ratta.supernote.pluginlib.utils

import com.facebook.react.bridge.ReadableMap
import com.ratta.supernote.pluginlib.constant.paramkey.TrailKey

class TrailUtils {

    companion object {
        @JvmStatic
        fun validTrailMap(trailMap: ReadableMap) : Boolean {
            if (trailMap.hasKey(TrailKey.LAYER_NUM)) {
                val layerNum = trailMap.getInt(TrailKey.LAYER_NUM)
                return layerNum in 0..3
            }
            return true
        }
    }
}
