#include "FileVisit.h"

const char *DEC_ALI_ACCESS_ID = "XAkWgD0A";
const char *DEC_ALI_ACCESS_SECRET = "KSVDWG";

extern "C"
JNIEXPORT void JNICALL
Java_com_ratta_supernote_pluginlib_jni_NativeJNI_getFilePath(JNIEnv *env, jobject thiz,
                                                                   jstring path,
                                                                   jobjectArray suffix,
                                                                   jobject list) {
    if (!path || !list || !suffix) {
        return;
    }
    FileVisit *fileVisit = new FileVisit;
    jsize jLen = env->GetArrayLength(suffix);
    if (jLen == 0) {
        return;
    }

    const char *rootPath = env->GetStringUTFChars(path, 0);

    // Set file suffix filters
    for (auto i = 0; i < jLen; i++) {
        jstring jstr = (jstring) env->GetObjectArrayElement(suffix, i);
        const char *s = env->GetStringUTFChars(jstr, 0);
        fileVisit->addFileSuffix(s);
        env->ReleaseStringUTFChars(jstr,s);
    }

    // Get List object
    jclass list_cls = env->GetObjectClass(list);
    jmethodID list_add = env->GetMethodID(list_cls, "add", "(Ljava/lang/Object;)Z");

    // Set JNI context
    fileVisit->setJNIEnv(env);
    fileVisit->setListObj(list);
    fileVisit->setListAdd(list_add);

    // Read
    fileVisit->readFileList(rootPath);

    delete fileVisit;

    env->DeleteLocalRef(list_cls);
    env->ReleaseStringUTFChars(path,rootPath);
}
