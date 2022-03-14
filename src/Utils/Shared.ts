//Define new NULL constant for much more readable undefined parameters
export const NULL = undefined

export function Sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}


export const isValidB64 = (b64img: string) : boolean=>{
    const b64_regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
    return b64_regex.test(b64img);
}

export const isSupportImage = (image_bytes: number[]) : boolean=>{
    //PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    //JPG: 0xFF 0xD8 0xFF 0xE0 0x00 0x10 0x4A 0x46 0x49 0x46 0x00 0x01, 0xFF 0xD8 0xFF 0xEE, 
    //ICO: 0x00 0x00 0x01 0x00
    const images_magic_bytes = [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
                               [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01], 
                               [0xFF, 0xD8, 0xFF, 0xEE], [0x00, 0x00, 0x01, 0x00]]
                        
   

    for (const magic_bytes of images_magic_bytes){
        if(arrayStartsWith(image_bytes, magic_bytes))
            return true
    }
    return false
}

export const arrayStartsWith = (arr: any[], data: any[] | any) : boolean=>{
    if (Array.isArray(data)){
        for(let index = 0; index < data.length; index++){
            if(arr[index] !== data[index])
                return false
        }
        return true
    }else{
        return arr[0] === data
    }
}

export const isValidEmail = (email: string): boolean =>{
    //Reference: https://emailregex.com/
    // eslint-disable-next-line
    const email_regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/    
    return email_regex.test(email)
}

export const formatString = (formatString: string, ...parameters:any): string =>{
    //FIXME: Parameter validation
    let finalString = "";
    for (let index = 0; index < parameters.length; index++){
        finalString = formatString.replace(`{${index}}`, parameters[index])
    }
    return finalString
}

export function isNumeric(val) {
    return /^-?\d+$/.test(val);
}

export function hasNumber(myString) {
    return /\d/.test(myString);
  }

export const checkForUndefined = (ob: any): boolean =>{
    const keys = Object.keys(ob)
    for(const key of keys){
        if(ob[key] === undefined) return false
    }
    return true;
}