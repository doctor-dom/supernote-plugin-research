package com.ratta.supernote.pluginlib.bean

/**
 * Note template.
 * @param name Template name
 * @param vUri Template image path for portrait orientation
 * @param hUri Template image path for landscape orientation
 */
data class NoteTemplate(
    val name: String,
    val vUri: String,
    val hUri: String
) {

    /**
     * No-arg constructor (required by some frameworks).
     */
    constructor() : this("", "", "")

    /**
     * Checks whether the template is valid.
     * @return True when name and paths are non-empty
     */
    fun isValid(): Boolean {
        return name.isNotEmpty() && vUri.isNotEmpty() && hUri.isNotEmpty()
    }

    /**
     * Gets the template path by orientation.
     * @param isVertical Whether the screen is in portrait orientation
     * @return Template path for the given orientation
     */
    fun getPathByOrientation(isVertical: Boolean): String {
        return if (isVertical) vUri else hUri
    }

    override fun toString(): String {
        return "NoteTemplate(name='$name', vPath='$vUri', hPath='$hUri')"
    }
}
