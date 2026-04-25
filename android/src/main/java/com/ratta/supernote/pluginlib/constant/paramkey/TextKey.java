package com.ratta.supernote.pluginlib.constant.paramkey;

public class TextKey {

    public static final String textContentFull = "textContentFull";
    public static final String fontSize = "fontSize";
    public static final String fontPath = "fontPath";

    public static final String textRect = "textRect";
    public static final String textLineHeight = "textLineHeight";
    public static final String textDigestData = "textDigestData";
    public static final String textType = "textType";
    public static final String textColor = "textColor";
    public static final String textTypeface = "textTypeface";
    public static final String letterSpacing = "letterSpacing";// Character spacing. Default: 0
    public static final String lineSpacingExtra = "lineSpacingExtra";  // Extra line spacing. Default: 0
    public static final String lineSpacingMultiplier = "lineSpacingMultiplier";// Default: 1.0F. Line-height multiplier
    public static final String textAlign = "textAlign"; // Alignment: 0=left, 1=center, 2=right
    public static final String textAntiAlias = "textAntiAlias";  // Anti-aliasing for smoother rendering. 0=off, 1=on
    public static final String textBold = "textBold";  // Typeface bold flag
    public static final String textFakeBold = "textFakeBold";  // Fake bold flag (simulates bold when the font has no bold). 0=off, 1=on
    public static final String textShadowLayer = "textShadowLayer";// Not supported
    public static final String textVertical = "textVertical"; // Vertical text layout (used in some languages)
    public static final String textItalics = "textItalics"; // Typeface italic flag
    public static final String textSkewX = "textSkewX"; // Skew value: negative tilts right, positive tilts left. Suggested: -0.25 ~ -0.35
    public static final String textFrameWidthType = "textFrameWidthType"; // 0=fixed width, 1=auto width
    public static final String textFrameWidth = "textFrameWidth"; // Border width. Must be > 0; otherwise defaults to 2
    public static final String textFrameStyle = "textFrameStyle"; // Border mode: 0=fill, 1=stroke, 2=fill+stroke, others=none
    public static final String textFrameStrokeColor = "textFrameStrokeColor";  // Border color (0-255, black to white; 0=black)
    public static final String textFrameFillColor = "textFrameFillColor"; // Fill color (0-255, black to white; 0=black)
    public static final String textEditable = "textEditable"; // Editable state: 0=editable, 1=not editable
    public static final String textLayer = "textLayer"; // Layer the text box belongs to

}
