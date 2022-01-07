import { ITask } from "pg-promise";
import {Element as ElementClass} from './Wrappers/Element'
import {Section as SectionClass} from './Wrappers/Section'
import {Entry as EntryClass} from './Wrappers/Entry'
import {Group as GroupClass} from './Wrappers/Group'

declare global {

    namespace Params{

        /**
        * Sets a new value for a object specific property.
        * @param id Unique identifier of section to change a property from
        * @param property_name Name of property to change value of
        * @param new_value New value for provided property
        * @param [transaction] Transaction object for querying
        */
        interface setProperty{
            id: number,
            property_name: string,
            new_value: any,
            transaction?: ITask<any>
        }

        namespace Section{

            /**
            * @param name Name of new sections
            * @param entry_id Unique identifier of entry the section should be part of
            * @param [pos_index] Position (index) of section in entry
            * @param [transaction] Transation object for querying
            */
            export interface create{
                name: string,
                entry_id: number,
                pos_index?: number,
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
            * @param element Instance of element to be added to section with provided id
            * @param [pos_index] Position (index) where the element should be place into. If not provided, it will be placed last
            * @param [transaction] Transaction object for querying
            */
            export interface addElement{
                id: number,
                element: ElementClass,
                pos_index?: number,
                transaction?: ITask<any>
            }


            /**
            * @param id Unique identifier of section an element should be removed from
            * @param element_id Unique identifier of element to be removed from section
            * @param del if true, the element will be deleted
            * @param [transaction] Transaction object for querying
            */
            export interface removeElement{
                id: number,
                element_id: number,
                del?:boolean,
                transaction? : ITask<any>
            }

            /**
            * @param id Unique identifier of section the element should be moved from
            * @param element_id Unique identifier of the element to be moved
            * @param new_section_id Unique identifier of section the element should be moved to
            * @param [new_pos_index] Position (index) of element in section the element will be moved to
            * @param [transaction] Transaction object for querying
            */
            export interface moveElement{
                id: number,
                element_id: number,
                new_section_id: number,
                new_pos_index?: number,
                transaction?: ITask<any>
            }

            /**
            * @param id Unique identifier of section
            * @param element_id Unique identifier of associated element to be repositioned
            * @param new_pos_index Position (index) the element should be moved to
            * @param [transaction] Transaction object for querying
            */
            export interface repositionElement{
                id: number,
                element_id: number,
                new_pos: number,
                transaction?: ITask<any>
            }

            /**
            * @param id Unique identifier of section all associated elements should be returned from
            * @param flat If true, only ids of associated elements will be returned 
            * @returns Array of Element instances, ids of associated elements or null if no element was found
            */
            export interface getElements{
                id: number,
                flat?: boolean
            }

            /**
            * @param id Unique identifier of section to be returned
            */
            export interface findById{
                id: number
            }

            /**
            * @param id Unique identifier of section to be deleted
            * @param [transaction] Transaction object for querying
            */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }
        }

        namespace Element{
            
            /**
            * @param name Name of new element
            * @param value Value/data of the element (e.g. actual password, binary data etc.)
            * @param type Type of element (e.g. password, cleartext, binary file etc.)
            * @param section_id Unique identifier of section the element should be added to
            * @param [pos_index] Position (index) for new element in section
            * @param [transaction] Transaction object for querying
            */
            export interface create{
                name: string,
                value: string,
                type: Types.Element.ElementType,
                section_id: number,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
            * @param id Unique identifier of element to be found 
            * @returns Instance of a found element or null if no element with provided id was found
            */
            export interface findById{
                id: number
            }

            /**
            * @param id Unique identifier for which it is to be checked whether an object with the same exists
            * @returns true if an element with the provided id was found, else false
            */
            export interface exists{
                id: number
            }

            /**
            * @param id Unique identifier of element to be deleted
            * @param [transaction] Transaction object for querying 
            */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }
        }

        namespace Entry{
            /**
            * @param name Name of the new entry
            * @param tags Array of tags of the new entry
            * @param icon Base64 encoded icon of the new entry. Defaults to a predefined default icon
            * @param group_id Unique identifier of group to add entry to
            * @param [pos_index] Position (index) of entry in group
            * @param [transaction] Transaction object for querying
            */
            export interface create{
                name: string,
                tags: string[],
                icon?: string,
                group_id: number,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of entry to add a section to
             * @param section Section to be added to entry
             * @param pos_index Position (index) to place new section to
             * @param [transaction] Transaction object for querying
             */
            export interface addSection{
                id: number,
                section: SectionClass,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of entry to remove section from
             * @param section_id Unique identifier of section to be removed from entry
             * @param del if true, removed section will be deleted completly
             * @param [transaction] Transaction object for querying
             */
            export interface removeSection{
                id: number,
                section_id: number,
                del?: boolean,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of entry to move section FROM
             * @param section_id Unique identifier of section to move
             * @param new_entry_id Unique identifier of entry to move section TO
             * @param [new_pos_index] Position (index) the section should be placed to in the new entry. Default: Last position
             * @param [transaction] Transaction object for querying
             */
            export interface moveSection{
                id: number,
                section_id: number,
                new_entry_id: number,
                new_pos_index: number,
                transaction? : ITask<any>
            }

            /**
             * @param id Unique identifier of entry to reposition section of
             * @param section_id Unique identifier of section to reposition
             * @param new_pos_index Position (index) the section should be placed to
             * @param [transaction] Transaction object for querying
             */
            export interface repositionSection{
                id: number,
                section_id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of entry to be deleted
             * @param [transaction] Transaction object for querying
             */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of entry to be found
             */
            export interface findById{
                id: number
            }

            /**
             * @param id Unique identifier of entry to fetch sections from
             * @param flat If true, only ids of associated entries will be returned  
             */
            export interface getSections{
                id: number,
                flat?: boolean
            }

            /**
             * @param id Unique identifier of entry to check existence of
             */
            export interface exists{
                id: number
            }
        }

        namespace Group{

            /**
             * @param name Name of new group
             * @param [icon] Base64 encoded icon
             * @param supergroup_id Unique identifier of group that will be the supergroup of this group
             * @param [pos_index] Position (index) of group in supergroup or root
             * @param [root] If true, group will be a root group
             * @param [transaction] Transaction object for querying
             */
            export interface create{
                name: string,
                icon?: string,
                supergroup_id?: number,
                pos_index?: number,
                root?: boolean,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group to be found
             */
            export interface findById{
                id: number
            }

            /**
             * @param id Unique identifier of group to check existence for
             */
            export interface exists{
                id: number
            }

            /**
             * @param id Unique identifier of group to fetch subgroups from
             * @param [flat] If true, only group ids will be returned
             */
            export interface getSubGroups{
                id: number,
                flat?: boolean
            }

            /**
             * @param id Unique identifier of group to fetch entries from
             * @param [flat] If true, only ids of entries will be returned
             */
            export interface getEntries{
                id: number,
                flat?: boolean
            }

            /**
             * @param id Unique identifier of group to be deleted
             * @param [transaction] Transaction object for querying
             */
            export interface deleteById{
                id: number,
                transaction?: ITask<any>
            }

            /**
             * @param flat If true, only ids of unassigned groups will be returned
             */
            export interface getUnassignedGroups{
                flat?: boolean
            }

            /**
             * @param id Unique identifier of group to add entry to
             * @param entry Entry to be added to group
             * @param pos_index Position (index) the entry should be place to. Default: Last position
             * @param [transaction] Transaction object for querying
             */
            export interface addEntry{
                id: number,
                entry: EntryClass,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group to remove entry from
             * @param entry_id Unique identifier of entry to be removed from group
             * @param [del] If true, entry will be deleted completely
             * @param [transaction] Transaction object for querying
             */
            export interface removeEntry{
                id: number,
                entry_id,
                del?: boolean,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group to reposition entry of
             * @param entry_id Unique identifier of entry to be repositioned
             * @param new_pos_index Position (index) the entry should be repositioned to
             * @param [transaction] Transaction object for querying
             */
            export interface repositionEntry{
                id: number,
                entry_id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group to move entry FROM
             * @param entry_id Unique identifier of entry to move
             * @param new_group_id Unique identifier of group to move entry TO
             * @param new_pos_index Position (index) to move entry to
             * @param [transaction] Transaction object for querying
             */
            export interface moveEntry{
                id: number,
                entry_id: number,
                new_group_id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group another group should be added to
             * @param group Group to be added to the supergroup
             * @param [pos_index] Position (index) the new subgroup should be positioned to
             * @param [transaction] Transaction object for querying
             */
            export interface addGroup{
                id: number,
                group: GroupClass,
                pos_index?: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group a subgroup should be removed from
             * @param subgroup_id Unique identifier of subgroup that should be removed
             * @param [del] If true, removed group will be deleted completely
             * @param [transaction] Transaction object for querying
             */
            export interface removeGroup{
                id: number,
                subgroup_id: number,
                del?: boolean,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group a subgroup should be reposition of
             * @param subgroup_id Unique identifier of subgroup that should be repositioned
             * @param new_pos_index Position (index) the subgroup should be positioned to
             * @param [transaction] Transaction object for querying
             */
            export interface repositionGroup{
                id: number,
                subgroup_id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }

            /**
             * @param id Unique identifier of group a subgroup should be moved FROM
             * @param subgroup_id Unique identifier of subgroupt that should be moved
             * @param new_supergroup_id Unique identifier of group a subgroup should be moved TO
             * @param new_pos_index Position (index) the subgroup should be positioned to in the new supergroup
             * @param [transaction] Transaction object for querying
             */
            export interface moveGroup{
                id: number,
                subgroup_id: number,
                new_supergroup_id: number,
                new_pos_index: number,
                transaction?: ITask<any>
            }
        }

        namespace User{
            interface create{
                email: string,
                username: string,
                password_hash: string,
                role?: Types.User.Role,
                forename: string,
                surname: string,
                display_name: string,
                enabled?: boolean,
                profile_picture?: string,
                transaction?: ITask<any>
            }

            interface checkEmailExistence{
                email: string
            }

            interface checkUsernameExistence{
                username: string
            }
        }
    }

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
              port: number
            },
            general:{
              sqlPath: string
            }
        }
    }
}