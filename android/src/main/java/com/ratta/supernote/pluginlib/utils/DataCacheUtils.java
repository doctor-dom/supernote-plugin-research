package com.ratta.supernote.pluginlib.utils;

import android.os.Parcel;
import android.text.TextUtils;
import android.util.Log;

import com.ratta.supernote.plugincommon.data.common.trail.Trail;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Utilities for caching note-related data.
 */
public class DataCacheUtils {
    private final String TAG = "DataCacheUtils";


    // Maximum allowed memory usage
    private final long MAX_MEMERY = 30 * 1024 *1024;
    /**
     * Map of note data keyed by uuid.
     */
    private ConcurrentHashMap<String, Trail> mTrailMap = new ConcurrentHashMap<>();



    // Most-recently-used stroke list
    private CopyOnWriteArrayList<String> mTrailUsedList = new CopyOnWriteArrayList<>();

    private String uuid = "";
    private Trail trail = null;

    // Approximate memory usage for cached strokes (bytes)
    private long trailsMemory = 1024;

    public Trail getTrail(String uuid) {
        if (TextUtils.equals(uuid, this.uuid) && trail != null) {
            return trail;
        }
        this.uuid = uuid;
        trail = mTrailMap.get(uuid);
        mTrailUsedList.remove(uuid);
        mTrailUsedList.add(0, uuid);
        return trail;
    }

    public void addTrail(Trail trail) {
        Log.i(TAG, "addTrail");
        mTrailMap.put(trail.getUUID(), trail);
        mTrailUsedList.add(0,trail.getUUID());

        // Update memory size estimate
        addTrailMapMemorySize(trail);

    }

    public void removeTrail(Trail trail) {
        mTrailMap.remove(trail.getUUID());
        mTrailUsedList.remove(trail.getUUID());
        removeTrailMapMemorySize(trail);

    }

    public void addNewTrail(Trail trail) {
        addTrail(trail);
        trimTrailMap();
    }

    /**
     * Quickly estimates the total memory usage of mTrailMap.
     * @return Memory usage in bytes
     */
    public long calculateMapMemorySize() {
        long totalSize = 0;

        // ConcurrentHashMap base overhead
        totalSize += 1024; // Estimated HashMap structural overhead

        // Estimate memory per entry
        for (Map.Entry<String, Trail> entry : mTrailMap.entrySet()) {
            // Key memory (String)
            totalSize += entry.getKey().length() * 2;
            // Value memory (Trail object)
            totalSize += MemoryCalculate.calculateTrailMemorySize(entry.getValue());
            // Entry object overhead
            totalSize += 32;
        }

        return totalSize;
    }

    private void addTrailMapMemorySize(Trail trail) {
        trailsMemory += trail.getUUID().length() * 2;
        // Value memory (Trail object)
        trailsMemory += MemoryCalculate.calculateTrailMemorySize(trail);
        // Entry object overhead
        trailsMemory += 32;
    }

    private void removeTrailMapMemorySize(Trail trail) {
        trailsMemory -= trail.getUUID().length() * 2;
        // Value memory (Trail object)
        trailsMemory -= MemoryCalculate.calculateTrailMemorySize(trail);
        // Entry object overhead
        trailsMemory -= 32;
    }

    public void clearTrailCache() {
        uuid = "";
        trail = null;
        mTrailMap.clear();
        trailsMemory = 1024;

    }

    public void updateTrailMapMemorySize(long oldSize, long newSize) {
        trailsMemory  = trailsMemory - oldSize + newSize;
    }

    /**
     * Trims the map to reduce cache size when it grows too large.
     */
    public void trimTrailMap() {
        if(trailsMemory > MAX_MEMERY) {
            removeTrail(trail);
        }
    }
}
