import { IDatabase, ITask } from "pg-promise";
import {Element as ElementClass} from './Wrappers/Element'
import {Section as SectionClass} from './Wrappers/Section'
import {Entry as EntryClass} from './Wrappers/Entry'
import {Group as GroupClass} from './Wrappers/Group'


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

    export namespace Params{
        export interface setProperty{
            id: number,
            property_name: string,
            new_value: any,
            transaction?: ITask<any>
        }
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
             * @param transaction Transaction for querying
             */
            export interface create{
                name: string,
                transaction?: ITask<any>
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
             * @param id Unique identifier of section to change entry_id from
             * @param entry_id Unique identifier of new entry
             * @param transaction Transaction for querying
             */
            export interface setEntry{
                id: number,
                new_entry_id: number,
                transaction?: ITask<any>
            }

            

            /**
             * @param id Unique identifier of section to change position from
             * @param pos_index New position (index) for section
             * @param transaction Transaction for querying 
             */
            export interface setPosition{
                id: number,
                new_pos: number,
                transaction?: ITask<any>
            }

            export interface setName{
                id: number,
                new_name: string,
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
            * @param transaction Transaction for querying
            */
            export interface create{
                name: string,
                value: string,
                type: ElementType,
                transaction?: ITask<any>
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
            export interface setPosition{
                id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of element to be moved to another section
             * @param new_section_id Unique identifier of section the element should be moved to
             * @param transaction Transaction for querying
             */
            export interface setSection{
                id: number,
                new_section_id: number,
                transaction?: ITask<any>
            }

            export interface setName{
                id: number,
                new_name: string,
                transaction?: ITask<any>
            }

            export interface setType{
                id: number,
                new_type: Types.Element.ElementType,
                transaction?: ITask<any>
            }

            export interface setValue{
                id: number,
                new_value: string,
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
             * @param transaction Transaction for querying
             */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }
        }
    }

    export namespace Entry{
        export namespace Params{
            export interface create{
                title: string,
                tags: string[],
                pos_index?: number,
                category_id?: number,
                icon?: string,
                transaction?: ITask<any>
            }

            export interface setProperty{
                id: number,
                property_name: string,
                new_value: any,
                transaction?: ITask<any>
            }

            export interface addSection{
                id: number,
                section: SectionClass,
                pos_index?: number,
                transaction?: ITask<any>
            }

            export interface removeSection{
                id: number,
                section_id: number,
                transaction?: ITask<any>
            }

            export interface moveSection{
                id: number,
                section_id: number,
                new_entry_id: number,
                new_pos: number,
                transaction? : ITask<any>
            }

            export interface repositionSection{
                id: number,
                section_id: number,
                new_pos: number,
                transaction?: ITask<any>
            }

            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }

            export interface findById{
                id: number
            }

            export interface getSections{
                id: number,
                flat?: boolean
            }

            export interface exists{
                id: number
            }
        }
    }

    export namespace Group{
        export namespace Params{
            export interface create{
                name: string,
                pos_index?: number,
                icon?: string,
                supergroup_id?: number,
                transaction?: ITask<any>
            }

            export interface findById{
                id: number
            }

            export interface exists{
                id: number
            }

            export interface getSubGroups{
                id: number,
                flat?: boolean
            }

            export interface getEntries{
                id: number,
                flat?: boolean
            }

            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }

            export interface setProperty{
                id: number,
                property_name: string,
                new_value: any,
                transaction?: ITask<any>
            }

            export interface addEntry{
                id: number,
                entry: EntryClass,
                pos_index: number,
                transaction?: ITask<any>
            }

            export interface removeEntry{
                id: number,
                entry_id,
                transaction: ITask<any>
            }

            export interface repositionEntry{
                id: number,
                entry_id: number,
                new_pos: number,
                transaction: ITask<any>
            }

            export interface moveEntry{
                id: number,
                entry_id: number,
                new_group_id: number,
                new_pos: number,
                transaction: ITask<any>
            }

            export interface addGroup{
                id: number,
                group: GroupClass,
                pos_index: number,
                transaction: ITask<any>
            }

            export interface removeGroup{
                id: number,
                subgroup_id: number,
                transaction: ITask<any>
            }

            export interface repositionGroup{
                id: number,
                subgroup_id: number,
                new_pos: number,
                transaction: ITask<any>
            }

            export interface moveGroup{
                id: number,
                subgroup_id: number,
                new_supergroup_id: number,
                new_pos: number,
                transaction: ITask<any>
            }
        }
    }
}

