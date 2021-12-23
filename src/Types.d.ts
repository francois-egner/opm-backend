import { IDatabase, ITask } from "pg-promise";
import {Element as ElementClass} from './Wrappers/Element'


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

    export namespace Section{
        export namespace Params{

            /**
             * @param name Name of new section
             * @param pos_index Position (index) of section inside an entry
             * @param entry_id Unique identifier of entry the section is assigned to
             */
            export interface create{
                name: string,
                pos_index: number,
                entry_id: number
                connection?: CustomConnection
            }

            /**
             * @param id Unique identifier of section to check existence for
             */
            export interface exists{
                id: number
            }

            /**
             * @param id Unique identifier of section the element should be added to
             * @param element Instance of element to be added to section
             * @param pos_index Position (index) where the element should be place to
             * @param transaction Transaction for querying
             */
            export interface addElement{
                id: number,
                element: ElementClass,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
             * id Unique identifier of section
             * element_id Unique identifier of element to be removed from section
             * transaction Transaction for querying
             */
            export interface removeElement{
                id: number,
                element_id: number,
                transaction? : ITask<any>
            }

            /**
             * @param id Unique identifier of section the element should be moved from
             * @param element_id Unique identifier of the element to be moved
             * @param new_section_id Unique identifier of section the element should be moved to
             * @param new_pos_index Position (index) of element in section the element will be moved to
             * @param transaction Transaction for querying
             */
            export interface moveElement{
                id: number,
                element_id: number,
                new_section_id: number,
                new_pos?: number,
                transaction?: ITask<any>
            }


            /**
             * @param id Unique identifier of section
             * @param element_id Unique identifier of element to be repositioned
             * @param new_pos_index Position (index) the element should be moved to
             * @param transaction Transaction for querying
            */
            export interface repositionElement{
                id: number,
                element_id: number,
                new_pos: number,
                transaction?: ITask<any>
            }

                        
            /**
             * @param id Unique identifier of section all elements should be returned from
             * @param flat If true, only ids of elements will be returned
             */
            export interface getElements{
                id: number,
                flat?: boolean
            }

            /**
             * @param id Unique identifier of section to be found
             */
            export interface findById{
                id: number
            }

            /**
             * @param id Unique identifier of section to be deleted
             * @param transaction Transaction for querying
             */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
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
                connection?: CustomConnection
            }
            
            /**
             * @param id Unique identifier of element to be found 
             */
            export interface findById{
                id: number
            }

            /**
            * @param id Unique identifier of element to change position of
            * @param new_pos New position (index)
            * @param transaction Transaction for querying
            */
            export interface changePosition{
                id: number,
                new_pos: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of element to be moved to another section
             * @param new_section_id Unique identifier of section the element should be moved to
             * @param transaction Transaction for querying
             */
            export interface changeSection{
                id: number,
                new_section_id: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of element to be found
             */
             export interface exists{
                id: number
            }

            /**
             * @param id Unique identifier of element to be deleted
             * @param connection Connection/Transaction for queyring
             */
            export interface deleteById{
                id: number,
                connection?: CustomConnection
            }
        }
    }
}

