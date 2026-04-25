//
// Created by qdh on 2021/8/26.
//

#ifndef SUPERNOTESEARCH_FILEVISIT_H
#define SUPERNOTESEARCH_FILEVISIT_H

#include <jni.h>
#include <string>
#include <queue>
#include <string.h>
#include <iostream>
#include <dirent.h>
#include <sys/stat.h>
#include <android/log.h>



using namespace std;
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR,"search" ,__VA_ARGS__)

class FileVisit {
public:
    FileVisit();

    ~FileVisit();

    void setListAdd(const jmethodID &list_add);

    void setListObj(const jobject &list_obj);

    void addFileSuffix(const char *s);

    void setJNIEnv(JNIEnv *m_env);

    bool isValidSuffix(const char *fileName);

    int readFileList(const char *basePath);

private:

    jmethodID list_add;
    jobject list_obj;
    JNIEnv *m_env;
    vector<char *> fileSuffix;
    const int SIZE=2048;
};


#endif //SUPERNOTESEARCH_FILEVISIT_H
