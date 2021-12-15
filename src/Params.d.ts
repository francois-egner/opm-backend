import { IDatabase, ITask } from "pg-promise";
import { NumericLiteral } from "typescript";


/**
 * Contains all interfaces for usage of named parameters across the whole project
 */
export namespace Params{

    type CustomConnection = IDatabase<any> | ITask<any>
    
    export namespace User{
        export const enum Role{
            normal = 0,
            admin = 1
        }

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
            role: Params.User.Role,
            connection?: Params.CustomConnection
        }
    }
}

