import { ITask } from "pg-promise"
import { PrismaClient, Prisma } from '@prisma/client'
import { Request, Response, NextFunction } from 'express';

declare global {

       
    type PrismaConnection = PrismaClient<any> | Omit<PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">
    /**
     * Custom defined types
     */
    namespace Types{
        
       
        
        /**
        * Types of exception
        * @param SQLError A database related error occured
        * @param DataError Received data, from whatever source was not valid
        * @param NetworkError Error related to lower level networking occured
        * @param RuntimeError Error realted to some general runtime behaviour occured (e.g. out of memory)
        * @param Unknown Unknown error when there is no additional information about the error available
        * @param ParameterError Invalid parameters provided to a method
        */
        const enum ExceptionType{
            SQLError = "SQL",
            DataError = "Data",
            NetworkError = "Network",
            RuntimeError = "Runtime",
            Unknown = "Unknown",
            ParameterError = "Parameter"
        }
        

        namespace User{
            /**
             * All user roles
             * @param normal Default user role. A "normal" user just has permissions to act in his own object scope
             * @param admin An admin is the most privileged user role. It allows the user to edit basically everything except
             *        viewing sensitive data (TODO: sensitive data need to be defined)
             */
            export const enum Role{
                normal = 0,
                admin = 1
            }
            
            interface OwnUser{
                id: number,
                email: string,
                role: Types.User.Role,
                forename: string,
                surname: string,
                display_name: string,
                enabled: boolean,
                root_id: number,
                profile_picture: string
            }

        }

        namespace Element{

            /**
            * @param ClearText Element value will be displayed clearly
            * @param Password Element value will be displayed as **** & shortcut to a password generator will be rendered
            */
            export const enum ElementType{
                ClearText = 0,
                Password = 1
            }

        }

        interface Configuration {
            postgresql:{
              host: string,
              port: number,
              database: string,
              username: string,
              password: string,
              keepAlive: boolean
            },
            express:{
              interface: string,
              port: number,
              jwt_secret: string
              jwt_expiration_time: number
            },
            general:{
                sqlPath: string,
                max_group_name_length: number, 
                transaction_timeout: number,
                transaction_maxWait: number
            }
        }
    }
}