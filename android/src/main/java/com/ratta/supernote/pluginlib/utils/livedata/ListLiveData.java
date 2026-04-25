package com.ratta.supernote.pluginlib.utils.livedata;

import android.util.Log;

import androidx.lifecycle.MutableLiveData;

import com.ratta.supernote.pluginlib.utils.GsonInstance;

import java.util.ArrayList;
import java.util.List;

public class ListLiveData<T> extends MutableLiveData<List<T>> {
    private final String TAG = "ListLiveData";
    private List<T> dataList = new ArrayList<>();

    public void addData(T data){
        Log.i(TAG,"ListLiveData addData data:"+ GsonInstance.getInstance().getGson().toJson(data));
        if(dataList.contains(data)) {
            return;
        }
        Log.i(TAG,"ListLiveData addData before:"+GsonInstance.getInstance().getGson().toJson(dataList));
        dataList.add(data);
        Log.i(TAG,"ListLiveData addData:"+GsonInstance.getInstance().getGson().toJson(dataList));
        postValue(dataList);
    }

}
