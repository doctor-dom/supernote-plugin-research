//
// Created by qdh on 2021/8/26.
//

#include "FileVisit.h"

FileVisit::FileVisit() {

}

void FileVisit::setListAdd(const jmethodID &list_add) {
    this->list_add = list_add;
}

void FileVisit::setListObj(const jobject &list_obj) {
    this->list_obj = list_obj;
}

void FileVisit::addFileSuffix(const char *s) {
    int len = strlen(s);
    char *tmp = new char[len + 2];
    tmp[0] = '.';
    strncpy(tmp + 1, s, len);
    tmp[len + 1] = '\0';
    LOGE("tmp : %s", tmp);
    fileSuffix.push_back(tmp);
}

void FileVisit::setJNIEnv(JNIEnv *m_env) {
    this->m_env = m_env;
}

bool FileVisit::isValidSuffix(const char *fileName) {

    char suf[32] = {0};
    int len1 = strlen(fileName);
    const char *p = fileName + (len1 - 1);
    int j = len1;
    while (j > 0 && *p != '.') {
        --p;
        --j;
    }
    if (j == 0) {
        return false;
    }
    int len = strlen(p);
    if (len > 9) {
        return false;
    }
    int i = 0;
    while (*p != '\0') {
        suf[i] = static_cast<char>(*p | (1 << 5));
        ++p;
        ++i;
    }
    suf[len] = '\0';
    for (int i = 0; i < fileSuffix.size(); ++i) {
        char *s = fileSuffix[i];
        if (strcmp(s, suf) == 0) {
            return true;
        }
    }
    return false;
}

int FileVisit::readFileList(const char *basePath) {
    DIR *dir;
    struct dirent *ptr;
    char base[SIZE];
    char fileName[SIZE];

    if ((dir = opendir(basePath)) == NULL) {
        LOGE("Open dir error...");
        LOGE("basePath : %s", basePath);
        return 1;
    }

    while ((ptr = readdir(dir)) != NULL) {
        if (strcmp(ptr->d_name, ".") == 0 ||
            ptr->d_name[0] == '.' ||
            strcmp(ptr->d_name, "..") == 0)    //current dir OR parent dir
            continue;
        else if (ptr->d_type == 8) {    //file

            LOGE("d_name : %s", ptr->d_name);
            if (isValidSuffix(ptr->d_name)) {
                memset(fileName, 0, SIZE);
                strcpy(fileName, basePath);
                strcat(fileName, "/");
                strcat(fileName, ptr->d_name);
                jstring jFileName = m_env->NewStringUTF(fileName);
                m_env->CallBooleanMethod(list_obj, list_add, jFileName);
                m_env->DeleteLocalRef(jFileName);
            }


        } else if (ptr->d_type == 4) {
            memset(base, '\0', sizeof(base));
            strcpy(base, basePath);
            strcat(base, "/");
            strcat(base, ptr->d_name);
            readFileList(base);
        }
    }
    closedir(dir);
    return 1;
}

FileVisit::~FileVisit() {
    for (auto &ptr:fileSuffix) {
        if (ptr) {
            delete ptr;
        }
    }
}
