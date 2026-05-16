package com.supertask

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.ratta.supernote.pluginlib.api.HostContext
import java.io.File

/**
 * Native module to experiment with opening .note files in the editor.
 * Tries multiple Intent strategies since the SDK's openFilePath only
 * opens the file manager.
 */
class NoteOpenerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NoteOpener"

    companion object {
        private const val TAG = "NoteOpener"
    }

    /**
     * Try opening a .note file using different Intent strategies.
     * @param path Full path to the .note file
     * @param strategy Which approach to try (0-5)
     */
    @ReactMethod
    fun openNote(path: String, strategy: Int, promise: Promise) {
        Log.i(TAG, "openNote path=$path strategy=$strategy")
        try {
            when (strategy) {
                0 -> strategyGenericView(path)
                1 -> strategyNoteApp(path)
                2 -> strategyFileManagerFlags(path)
                3 -> strategyDataUri(path)
                4 -> strategyNoteAppAlt(path)
                5 -> strategyBroadcast(path)
                else -> {
                    promise.reject("INVALID", "Unknown strategy: $strategy")
                    return
                }
            }
            promise.resolve("strategy $strategy dispatched for $path")
        } catch (e: Exception) {
            Log.e(TAG, "openNote failed strategy=$strategy", e)
            promise.reject("ERROR", "strategy $strategy failed: ${e.message}", e)
        }
    }

    /**
     * Strategy 0: Generic ACTION_VIEW, no component set.
     * Let Android resolve which app handles .note files.
     */
    private fun strategyGenericView(path: String) {
        Log.i(TAG, "Strategy 0: generic ACTION_VIEW")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(Uri.fromFile(File(path)), "application/octet-stream")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        HostContext.getInstance().startActivity(intent)
    }

    /**
     * Strategy 1: Target NOTE app directly.
     * Supernote NOTE app package is likely com.ratta.supernote.note
     */
    private fun strategyNoteApp(path: String) {
        Log.i(TAG, "Strategy 1: target NOTE app")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setComponent(ComponentName(
                "com.ratta.supernote.note",
                "com.ratta.supernote.note.NoteMainActivity"
            ))
            putExtra("only_open_file", path)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        HostContext.getInstance().startActivity(intent)
    }

    /**
     * Strategy 2: Same as SDK openFilePath but with CLEAR_TOP + NEW_TASK flags.
     * The original has no flags set, which may cause activity stacking issues.
     */
    private fun strategyFileManagerFlags(path: String) {
        Log.i(TAG, "Strategy 2: file manager with flags")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setComponent(ComponentName(
                "com.ratta.supernote.inbox",
                "com.ratta.supernote.explorer.FileManagerMainActivity"
            ))
            putExtra("only_open_file", path)
            putExtra("source_type", 2)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }
        HostContext.getInstance().startActivity(intent)
    }

    /**
     * Strategy 3: ACTION_VIEW with data URI, no component.
     * Uses file:// URI with wildcard MIME type.
     */
    private fun strategyDataUri(path: String) {
        Log.i(TAG, "Strategy 3: data URI wildcard")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(Uri.fromFile(File(path)), "*/*")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        HostContext.getInstance().startActivity(intent)
    }

    /**
     * Strategy 4: Target NOTE app with alternative class names.
     * Try com.ratta.supernote as package with various activity names.
     */
    private fun strategyNoteAppAlt(path: String) {
        Log.i(TAG, "Strategy 4: target NOTE app (alt)")
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setComponent(ComponentName(
                "com.ratta.supernote",
                "com.ratta.supernote.NoteMainActivity"
            ))
            putExtra("only_open_file", path)
            putExtra("file_path", path)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        HostContext.getInstance().startActivity(intent)
    }

    /**
     * Strategy 5: Broadcast intent instead of activity.
     * Some Supernote system functions may listen for broadcasts.
     */
    private fun strategyBroadcast(path: String) {
        Log.i(TAG, "Strategy 5: broadcast")
        val intent = Intent("com.ratta.supernote.ACTION_OPEN_FILE").apply {
            putExtra("file_path", path)
            putExtra("only_open_file", path)
            addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES)
        }
        reactApplicationContext.sendBroadcast(intent)
    }
}
