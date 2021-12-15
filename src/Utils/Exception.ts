import HttpStatus from 'http-status-codes';
import { ExceptionType } from './Shared';


/**
 * Custom internal exception for establishing a uniform way of error handling
 */
export class Exception{
    /**
     * The type of exception (see ExceptionType)
     */
    private _type: ExceptionType;
    /**
     * Information about the exact line of code that caused the internal exception
     */
    private _code: any;
    /**
     * The status of the response to be sent after the Exception was thrown
     */
    private _responseStatus: number;
    /**
     * The message to be logged that describes the cause of the exception
     */
    private _message: string;

    /**
     * Constructor
     * @param {string} message - The message to be logged
     * @param {ExceptionType} type - The type of exception
     * @param {number} reponseStatus - The status of the response to be send to the requester
     */
    constructor(message: string, type: ExceptionType = ExceptionType.RuntimeError, reponseStatus: number = HttpStatus.INTERNAL_SERVER_ERROR){
        this._type = type
        this._code = this.codeInfo()
        this._responseStatus = reponseStatus;
        this._message = message;

    }

    /**
     * Returns an object that identifies the exact code where the exception was thrown
     * @returns object of code information
     */
    private codeInfo(): any{

        const err = new Error();
        const stack = err.stack as string;

        const callerLine = stack.split("\n")[3];
        const index = callerLine.indexOf("at ");
        const clean = callerLine.slice(index+2, callerLine.length);
        const info = clean.split("\\")[clean.split("\\").length-1];

        const file = info.split(":")[0];
        const line = Number(info.split(":")[1]);
        const char = Number(info.split(":")[2].slice(0,-1));

        const data = {
            file,
            line,
            char
        }


        return data;
    }

    get code(): string{
        return `File: ${this._code.file} | Line: ${this._code.line} | Column: ${this._code.char}`
    }

    get responseStatus(): number{
        return this._responseStatus;
    }

    get message(): string{
        return this._message;
    }

    get type(): ExceptionType{
        return this._type;
    }
}