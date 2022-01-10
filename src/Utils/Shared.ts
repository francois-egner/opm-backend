


export const isValidB64 = (b64img: string) : boolean=>{
    const b64_regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
    return b64_regex.test(b64img);
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

export const checkForUndefined = (ob: any): boolean =>{
    const keys = Object.keys(ob)
    for(const key of keys){
        if(typeof ob[key] === "undefined") return false
    }
    return true;
}