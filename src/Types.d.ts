import { IDatabase, ITask } from "pg-promise";
import { NumericLiteral } from "typescript";


/**
 * Contains all interfaces for usage of named parameters across the whole project
 */
export namespace Types{

    type CustomConnection = IDatabase<any> | ITask<any>

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
    
    export namespace User{
        export const enum Role{
            normal = 0,
            admin = 1
        }

        export namespace Params{
            /**
            * @param email E-mail address of the new user
            * @param password_hash Hashed password of new user
            * @param forename Forename of new user
            * @param surname Surname of new user
            * @param role Role of new user
            * @param display_name Displayed name
            * @param connection Task/Transaction for querying 
            */
            export interface create{
                email: string,
                password_hash: string,
                forename?: string,
                surname?: string,
                display_name: string,
                role: Types.User.Role,
                connection?: Types.CustomConnection
            }
        }
    }

    export namespace Element{

        /**
         * @param ClearText Element value will be displayed clearly
         * @param Password Element value will be displayed as **** & shortcut to a password generator will be rendered
         */
        export const enum ElementType{
            ClearText = 0,
            Password = 1
        }

        
        export namespace Params{
            /**
            * @param name Name of new element
            * @param value Actual value of new element
            * @param type Type of element (e.g. password, cleartext etc.)
            * @param pos_index Position (index) of element in section
            * @param section_id Unique identifier of section the new element will be part of
            * @param connection Task/Transaction for querying
            */
            export interface create{
                name: string,
                value: string,
                type: ElementType,
                pos_index?: number,
                section_id: number,
                connection?: CustomConnection
            }
            
            /**
             * @param id Unique identifier of element to be found 
             */
            export interface findById{
                id: number
            }
        }
    }
}

