package com.ratta.supernote.pluginlib.modules.bean;

import android.icu.text.Collator;
import android.icu.util.ULocale;
import android.os.Build;

import androidx.annotation.RequiresApi;

import com.ratta.supernote.pluginlib.utils.FileUtils;

import java.util.Comparator;
import java.util.Locale;

public class ImageInfo {
    private String path;
    private String name;

    private boolean isSelect = false;
    private boolean isAz = false;
    private boolean isSpecial = false;

    public ImageInfo(String path) {
        this.path = path;
        this.name = FileUtils.getFileName(path);
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isSelect() {
        return isSelect;
    }

    public void setSelect(boolean select) {
        isSelect = select;
    }

    public boolean isAz() {
        return isAz;
    }

    public void setAz(boolean az) {
        isAz = az;
    }

    public boolean isSpecial() {
        return isSpecial;
    }

    public void setSpecial(boolean special) {
        isSpecial = special;
    }

    public static class PictureNameComparator implements Comparator<ImageInfo> {

        private static final String A_Z_A_Z = "^[0-9a-zA-z].*";
        private static final String special = "^[`~!@#$%^&*()+=|{}':;',\\\\[\\\\].<>/?~！@#￥%……&*（）——+|{}【】‘；：”“’。，、？].*";
        private boolean changSort;
        private int SECOND = 1;
        private int FIRST = -1;
        Collator collator;

        // @param changSort true for ascending order, false for descending order
        @RequiresApi(api = Build.VERSION_CODES.N)
        public PictureNameComparator(boolean changSort) {
            this.changSort = changSort;
            Locale locale = Locale.getDefault();
            collator = Collator.getInstance(ULocale.forLocale(locale));
        }

        @RequiresApi(api = Build.VERSION_CODES.N)
        @Override
        public int compare(ImageInfo lhs, ImageInfo rhs) {

            Integer compare1 = letterSort(lhs, rhs);
            if (compare1 != null) {
                return compare1;
            }

            int compare = collator.compare(lhs.getName(), rhs.getName());
            if (!changSort) {
                return -compare;
            }
            return compare;
        }

        private Integer letterSort(ImageInfo lhs, ImageInfo rhs) {
            boolean lhsAZAZ = lhs.isAz();
            boolean lhsSpecial = lhs.isSpecial();
            boolean rhsAZAZ = rhs.isAz();
            boolean rhsSpecial = rhs.isSpecial();
            if (lhsAZAZ || rhsAZAZ || lhsSpecial || rhsSpecial) {
                if ((lhsSpecial || lhsAZAZ) && (rhsSpecial || rhsAZAZ)) {
                    int compare = lhs.getName().compareToIgnoreCase(rhs.getName());// Compare two files in dictionary order
                    if (!changSort) {
                        return -compare;
                    }
                    return compare;
                } else if ((lhsSpecial || lhsAZAZ)) {
                    return changSort ? FIRST : SECOND;
                } else {
                    return changSort ? SECOND : FIRST;
                }
            }

            return null;
        }
    }
}
