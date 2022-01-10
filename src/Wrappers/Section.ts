import { connection as conn, sectionQueries } from "../../db"
import { checkForUndefined, formatString } from "../Utils/Shared"
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import {Element} from "./Element"
import { Entry } from "./Entry"
import { User } from "./User"

/**
 * Property names that may be changed by calling setProperty()
 */
const propertyNames = ["name", "pos_index", "entry_id"]

/**
 * A section is part of an entry. It is used to divide an entry into different regions/sections. A section contains
 * elements that are associated to each other, for example username and a password element
 */
export class Section{

    /**
    * Unique identifier of section
    */
    private readonly _id: number

    /**
    * Name of section
    */
    private _name: string

    /**
    * Position (index) inside the associated entry
    */
    private _pos_index: number

    /**
    * Unique identifier of entry the section is associated with/is part of
    */
    private _entry_id: number

    /**
    * Elements associated to this section
    */
    private _elements: Element[] = []

    
    constructor(id: number, name: string, pos_index: number, entry_id: number, elements?:Element[]){
        this._id = id
        this._name = name
        this._pos_index = pos_index
        this._entry_id = entry_id
        if(elements)
            this._elements = elements as Element[]
        
    }



    /**
    * Creates a new section
    * @param name Name of new sections
    * @param entry_id Unique identifier of entry to add new section to
    * @param Position (index) to position new section to
    * @param [transaction] Transaction object for querying
    */
    static async create({name, entry_id, pos_index, transaction} : Params.Section.create) : Promise<Section>{
        return transaction
        ? await Section.create_private({name: name, entry_id: entry_id, pos_index: pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Section.create_private({name: name, entry_id: entry_id, pos_index: pos_index, transaction: tx})})
    }

    private static async create_private({name, entry_id, pos_index, transaction} : Params.Section.create) : Promise<Section>{
        
        //TODO: Proper param validation
        if (!checkForUndefined({name})) 
            throw new Exception("Failed to create new section. At least one argument is undefined!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        const entry = await Entry.findById({id: entry_id, connection: transaction})

        if(entry == null)
            throw new Exception("Entry to add section to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
    
        const sections_count = entry!.sections.length
    
        if(!pos_index)
            pos_index = sections_count
    
        if(pos_index < 0 || pos_index > sections_count) 
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
    
                   
        for (const section of entry!.sections as Section[]){
            if(section.pos_index >= pos_index!)
                await Section.setProperty({id: section.id, property_name:"pos_index", new_value:section.pos_index+1, connection: transaction})
        }
            
        const queryData = [name, entry_id, pos_index]
        const sectionData = await transaction.one(sectionQueries.create, queryData)

        return new Section(sectionData.id, sectionData.name, sectionData.pos_index, sectionData.entry_id)
        
    }



    /**
    * Checks if a section with provided id does exist 
    * @param id Unique identifier of section to check existence for
    */
    static async exists({id, connection=conn} : Params.Section.exists) : Promise<boolean>{
        
        try{
            const existsData = await connection.one(sectionQueries.exists, [id]);
            return existsData.exists;
        }catch(err: unknown){
            throw new Exception("Failed to check for existence!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
    * Tries to fetch section data of the section with the provided id
    * @param id Unique identifier of section to be returned
    * @returns Section instance or null if no section with provided id was found
    */
    static async findById({id, connection} : Params.Section.findById) : Promise<Section | null>{
        return connection
        ? await Section.findById_private({id: id, connection: connection})
        : await conn.task(async (task)=>{return await Section.findById_private({id: id, connection: task})})
    }

    private static async findById_private({id, connection} : Params.Section.findById) : Promise<Section | null>{
        try{
            const sectionData = await connection.oneOrNone(sectionQueries.findById, [id])
            
            if (sectionData == null)
                return null

            const elements = await Section.getElements({id:id, flat:false, connection: connection}) as Element[]
            return new Section(sectionData.id, sectionData.name, sectionData.pos_index, sectionData.entry_id, elements)
        }catch(err: unknown){
            throw new Exception("Failed to find section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Fetches all elements associated to section identified by provided id
     * @param id Unique identifier of section all associated elements should be returned from
     * @param flat If true, only ids of associated elements will be returned
     * @param [connection] Task or Transaction object for querying
     * @returns Array of Element instances, ids of associated elements or null if no element was found
     */
    static async getElements({id, flat=true, connection} : Params.Section.getElements) : Promise<Element[] | number[] | null>{
        return connection
        ? await Section.getElements_private({id: id, flat: flat, connection: connection})
        : await conn.task(async (task)=>{return await Section.getElements_private({id: id, flat: flat, connection: task})})
    }

    private static async getElements_private({id, flat=true, connection} : Params.Section.getElements) : Promise<Element[] | number[] | null>{
        const exists = await Section.exists({id: id, connection: connection})
        
        if(!exists)
            throw new Exception("Failed to find section!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        try{
            const elements: Element[] | number[] = []
            const elementsData = await connection.manyOrNone(flat ? sectionQueries.getElementsFlat: sectionQueries.getElements, [id])
            
            if(elementsData == null)
                return null

            for(const elementData of elementsData){
                const newElement = flat ? elementData.id : new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
                elements.push(newElement)
            }

            return elements
        }catch(err: unknown){
            throw new Exception("Failed to fetch all element of section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Deletes section and all of its elements
     * @param id Unique identifier of section to be deleted
     * @param [transaction] Transaction object for querying
     */
    static async deleteById({id, transaction} : Params.Section.deleteById) : Promise<void>{
        return transaction
        ? await Section.deleteById_private({id: id, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Section.deleteById_private({id: id, transaction: tx})})
    }

    private static async deleteById_private({id, transaction} : Params.Section.deleteById) : Promise<void>{
        const section = await Section.findById({id: id, connection: transaction})
        if (section == null)
            throw new Exception("Failed to delete section. No section with provided id exists!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        try{
            //Atomicity needs to be guaranteed, therefore we must use transactions from now on
            //Start a new transaction if no transaction was provided
            
            await Entry.removeSection({id: section.entry_id, section_id: id, transaction: transaction})
                
            const elements_id = await Section.getElements({id: id, connection: transaction}) as number[]
            for(const element_id of elements_id) 
                await Element.deleteById({id: element_id, transaction:transaction})
                
            await transaction!.none(sectionQueries.deleteById, [id])
                
        }catch(err: unknown){
            throw new Exception("Failed to delete section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }



    /**
     * Fetches the id or full objecct of user that owns the section
     * @param id Unique identifier of section to get owner of
     * @param [flat] If true, only id will be returned
     * @returns Section object or user id
    */
    static async getOwner({id, flat=true, connection} :  Params.Section.getOwner) : Promise<User|number>{
        return connection
        ? await Section.getOwner_private({id: id, flat: flat, connection: connection})
        : await conn.task(async (task)=>{return await Section.getOwner_private({id: id, flat: flat, connection: task})})
    }

    private static async getOwner_private({id, flat=true, connection} :  Params.Section.getOwner) : Promise<User|number>{
        const section = await Section.findById({id: id, connection: connection})

        if(section == null)
            throw new Exception("No section with provided id found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        return await Entry.getOwner({id: section.entry_id, flat: flat,connection: connection})
    }
    


    //#region Element management

    /**
    * Add an element to a section
    * @param id Unique identifier of section the element should be added to
    * @param element Instance of element to be added to section with provided id
    * @param [pos_index] Position (index) where the element should be place into. If not provided, it will be placed last
    * @param [transaction] Transaction object for querying
    */
    static async addElement({id, element, pos_index, transaction} : Params.Section.addElement) : Promise<void>{
        return transaction
        ? await Section.addElement_private({id: id, element: element, pos_index: pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Section.addElement_private({id: id, element: element, pos_index: pos_index, transaction: tx})})    
    }

    static async addElement_private({id, element, pos_index, transaction} : Params.Section.addElement) : Promise<void>{
        //TODO: More parameter validation
        const section = await Section.findById({id: id, connection: transaction})

        if(section == null) 
            throw new Exception("Section to add element to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const elements_count = section!.elements.length

        if(!pos_index)
            pos_index = elements_count

        if(pos_index < 0 || pos_index > elements_count) throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        for (const el of section!.elements){
            if(el.pos_index >= pos_index!)
                await Element.setProperty({id: el.id, property_name:"pos_index", new_value: el.pos_index+1, connection: transaction})    
                    
        }
            
        await  Element.setProperty({id: element.id, property_name: "section_id", new_value: id, connection: transaction})
        await Element.setProperty({id: element.id, property_name: "pos_index", new_value: pos_index!, connection: transaction})
        
    }

    

    /**
    * Removes an element from a section
    * @param id Unique identifier of section an element should be removed from
    * @param element_id Unique identifier of element to be removed from section
    * @param del if true, the element will be deleted
    * @param [transaction] Transaction object for querying
    */
    static async removeElement({id, element_id, del=false, transaction} : Params.Section.removeElement) : Promise<void>{
       return transaction
       ? await Section.removeElement_private({id: id, element_id: element_id, del: del, transaction: transaction})
       : await conn.tx(async (tx)=>{return await Section.removeElement_private({id: id, element_id: element_id, del: del, transaction: tx})})
    }

    private static async removeElement_private({id, element_id, del, transaction} : Params.Section.removeElement) : Promise<void>{
        
        const elements = await Section.getElements({id: id, flat: false, connection: transaction}) as Element[]
        const element_to_remove = await Element.findById({id: element_id, connection: transaction})
        
        if(element_to_remove == null)
            throw new Exception("Unable to find Element with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_element = elements.filter((element)=> element.id === element_id)
        if(found_element.length == 0)
            throw new Exception("Could not find element in given section!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        for(const element of elements){
            if(element.pos_index > element_to_remove.pos_index)
                await Element.setProperty({id: element.id, property_name: "pos_index", new_value: element.pos_index-1, connection: transaction})
        }

        if(del)
            await Element.deleteById({id: element_id, transaction: transaction})
    }



    /**
    * Repositions an element inside a section
    * @param id Unique identifier of section
    * @param element_id Unique identifier of associated element to be repositioned
    * @param new_pos_index Position (index) the element should be moved to
    * @param [transaction] Transaction object for querying
    */
    private static async repositionElement({id, element_id, new_pos, transaction} : Params.Section.repositionElement) : Promise<void>{
        return transaction
        ? await Section.repositionElement_private({id: id, element_id: element_id, new_pos: new_pos, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Section.repositionElement_private({id: id, element_id: element_id, new_pos: new_pos, transaction: tx})})        
    }

    private static async repositionElement_private({id, element_id, new_pos, transaction} : Params.Section.repositionElement) : Promise<void>{
        const elements = await Section.getElements({id: id, flat: false, connection: transaction}) as Element[]
        const element_to_reposition = await Element.findById({id: element_id, connection: transaction})

        if(new_pos < 0 || new_pos >= elements.length)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        
        if(element_to_reposition == null)
            throw new Exception("Element to be moved not found!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        for (const element of elements){
            if(element_to_reposition.pos_index < new_pos){
                if(element.pos_index > element_to_reposition.pos_index && element.pos_index <= new_pos)
                    await Element.setProperty({id: element.id, property_name:"pos_index", new_value:element.pos_index-1, connection: transaction})    
            }else{
                if(element.pos_index >= new_pos && element.pos_index < element_to_reposition.pos_index)
                    await Element.setProperty({id: element.id, property_name:"pos_index", new_value:element.pos_index+1, connection: transaction})     
            }
        }
            
        await Element.setProperty({id: element_id, property_name:"pos_index", new_value: new_pos, connection: transaction})
        
    }


    
    /**
    * Repositions an element inside a section or moves it to another section 
    * @param id Unique identifier of section the element should be moved from
    * @param element_id Unique identifier of the element to be moved
    * @param new_section_id Unique identifier of section the element should be moved to
    * @param [new_pos_index] Position (index) of element in section the element will be moved to
    * @param [transaction] Transaction object for querying
    */
    static async moveElement({id, element_id, new_section_id, new_pos_index, transaction} : Params.Section.moveElement) : Promise<void>{
        return transaction
        ? await Section.moveElement_private({id: id, element_id: element_id, new_section_id: new_section_id, new_pos_index: new_pos_index, transaction: transaction})
        : await conn.tx(async (tx)=>{return await Section.moveElement_private({id: id, element_id: element_id, new_section_id: new_section_id, new_pos_index: new_pos_index, transaction: tx})})
    }

    private static async moveElement_private({id, element_id, new_section_id, new_pos_index, transaction} : Params.Section.moveElement) : Promise<void>{
        const elements = await Section.getElements({id: id, flat: false, connection: transaction}) as Element[]
        const element_to_move = await Element.findById({id: element_id, connection: transaction})

        if(element_to_move == null)
            throw new Exception("Could not find element with provided id!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)

        const exists = await Section.exists({id: new_section_id, connection: transaction})
        if(!exists)
            throw new Exception("Section to move element to does not exist!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        const found_element = elements.filter((element)=> element.id === element_id)
        if(found_element.length == 0)
                throw new Exception("Element to be moved is not part of provided section!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        
        if(id === new_section_id){
            if(!new_pos_index)
                throw new Exception("New position must be defined when moving inside a section!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
                
            await Section.repositionElement({id: id, element_id: element_id, new_pos: new_pos_index, transaction: transaction})
            return
        }
                
        await Section.removeElement({id: id, element_id: element_id, transaction: transaction})
        await Section.addElement({id: new_section_id, element: element_to_move, pos_index: new_pos_index, transaction: transaction})
        
    }

    //#endregion
    

    //#region Getters & Setters

    /**
     * Sets a new value for a object specific property.
     * @param id Unique identifier of section to change a property from
     * @param property_name Name of property to change value of
     * @param new_value New value for provided property
     * @param [transaction] Transaction object for querying
     */

    static async setProperty({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        return connection
        ? await Section.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: connection})
        : await conn.tx(async (tx) => {return await Section.setProperty_private({id: id, property_name: property_name, new_value: new_value, connection: tx})})
    }

    static async setProperty_private({id, property_name, new_value, connection} : Params.setProperty) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Entry.exists({id: id, connection: connection})
        if(!exists)
            throw new Exception("Unable to find section to change porperty of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{

            const queryString = formatString(sectionQueries.setProperty as string, property_name)
            const queryData = [id,  new_value]

            await connection.none(queryString, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change property of section!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }


    
    get id(): number{
        return this._id
    }

    get name(): string{
        return this._name
    }
    
    get pos_index(): number{
        return this._pos_index
    }

    get entry_id(): number{
        return this._entry_id
    }

    get elements():Element[]{
        return this._elements
    }
    //#endregion
}