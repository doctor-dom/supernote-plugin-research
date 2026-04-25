package com.ratta.supernote.pluginlib.utils

import com.ratta.supernote.pluginlib.bean.NoteTemplate

/**
 * Template utilities.
 * Provides a predefined list of note templates.
 */
class TemplateUtils {

    companion object {
        /**
         * Predefined note template list.
         * NoteTemplate objects are created in the same order as the original TemplatesInfo.
         */
        @JvmStatic
        val templateList: List<NoteTemplate> = listOf(
            // 0. Blank
            NoteTemplate("style_white", "style_white", "style_h_white"),

            // 1. 8mm ruled line
            NoteTemplate("style_8mm_ruled_line", "style_8mm_ruled_line", "style_h_8mm_ruled_line"),

            // 2. 9mm ruled line
            NoteTemplate("style_9mm_ruled_line", "style_9mm_ruled_line", "style_h_9mm_ruled_line"),

            // 3. 10mm ruled line
            NoteTemplate("style_10mm_ruled_line", "style_10mm_ruled_line", "style_h_10mm_ruled_line"),

            // 4. 5mm grid
            NoteTemplate("style_5mm_grid", "style_5mm_grid", "style_h_5mm_grid"),

            // 5. 5mm engineering grid
            NoteTemplate("style_5mm_engineering_grid", "style_5mm_engineering_grid", "style_h_5mm_engineering_grid"),

            // 6. 10mm grid
            NoteTemplate("style_10mm_grid", "style_10mm_grid", "style_h_10mm_grid"),

            // 7. 5mm dot grid
            NoteTemplate("style_5mm_dots", "style_5mm_dots", "style_h_5mm_dots"),

            // 8. 9mm Cornell notes
            NoteTemplate("style_9mm_cnt", "style_9mm_cnt", "style_h_9mm_cnt"),

            // 9. 10mm Cornell notes
            NoteTemplate("style_10mm_cnt", "style_10mm_cnt", "style_h_10mm_cnt"),

            // 10. Arabic lined ruling
            NoteTemplate("style_arabic_line_ruling", "style_arabic_lined_ruling", "style_h_arabic_lined_ruling"),

            // 11. College ruled
            NoteTemplate("style_college_ruled", "style_college_ruled", "style_h_college_ruled"),

            // 12. Wide ruled
            NoteTemplate("style_wide_ruled", "style_wide_ruled", "style_h_wide_ruled"),

            // 13. Four quadrants
            NoteTemplate("style_four_quadrant_method", "style_four_quadrants", "style_h_four_quadrants"),

            // 14. Four-wire grid
            NoteTemplate("style_four_wire", "style_four_wire", "style_h_four_wire"),

            // 15. French Seyes ruling
            NoteTemplate("style_french_seyes_ruling", "style_french_seyes_ruling", "style_h_french_seyes_ruling"),

            // 16. Hand-drawn diary
            NoteTemplate("style_hand_sketch_diary", "style_hand_drawn_diary", "style_h_hand_drawn_diary"),

            // 17. Letter format
            NoteTemplate("style_letter_format", "style_letter_format", "style_h_letter_format"),

            // 18. List format
            NoteTemplate("style_list_format", "style_list_format", "style_h_list_format"),

            // 19. Meeting notes
            NoteTemplate("style_meeting_notes", "style_meeting_notes", "style_h_meeting_notes"),

            // 20. 3x3 grid
            NoteTemplate("style_nine_palace_lattice", "style_by_3_grid", "style_h_3_by_3_grid"),

            // 21. Reading notes
            NoteTemplate("style_reading_note", "style_reading_note", "style_h_reading_note"),

            // 22. Sheet format
            NoteTemplate("style_sheet_format", "style_sheet_format", "style_h_sheet_format"),

            // 23. Staff
            NoteTemplate("style_staff", "style_staff", "style_h_staff"),

            // 24. Task list
            NoteTemplate("style_task_list", "style_task_list", "style_h_task_list"),

            // 25. Tian zi ge
            NoteTemplate("style_tian_zige", "style_tian_zi_ge", "style_h_tian_zi_ge"),

            // 26. Daily calendar
            NoteTemplate("style_daily_calendar", "style_daily_calendar", "style_h_daily_calendar"),

            // 27. Weekly calendar
            NoteTemplate("style_weekly_calendar", "style_weekly_calendar", "style_h_weekly_calendar")
        )

        /**
         * Gets a template by name.
         * @param name Template name
         * @return The matching NoteTemplate, or null if not found
         */
        @JvmStatic
        fun getTemplateByName(name: String): NoteTemplate? {
            return templateList.find { it.name == name }
        }

        /**
         * Gets all template names.
         * @return Template name list
         */
        @JvmStatic
        fun getAllTemplateNames(): List<String> {
            return templateList.map { it.name }
        }
    }
}
