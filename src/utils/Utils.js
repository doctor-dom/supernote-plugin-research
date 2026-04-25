
import { PixelRatio } from 'react-native';

export const pxToDp =(px) =>{
    const dp = px / PixelRatio.get();
    return dp;
}

export const dpToPx=(dp) =>{
    const px = dp * PixelRatio.get();
    return px;
}