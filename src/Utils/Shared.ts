

export const isValidB64 = (b64img: string) : boolean=>{
    const validationRegex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/
    return validationRegex.test(b64img);
}

 /**
     * Defined types of Exception
     */
  export const enum ExceptionType{
    SQLError = "SQL",
    DataError = "Data",
    NetworkError = "Network",
    RuntimeError = "Runtime",
    Unknown = "Unknown",
    ParameterError = "Parameter"
}