
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { connection as conn, elementQueries } from "../../db"
import { Section } from "../Wrappers/Section"
import { formatString } from "../Utils/Shared"

/**
 * Property names that may be changed by calling setProperty()
 */
const propertyNames = ["name", "pos_index", "value", "section_id", "type"]

/**
 * An Element is a part of a section. It represents an information that should be stored in a section.
 * The name of an element is like a title (e.g. Username) and the value is the actual information that
 * should be stored (e.g. the actual username)
 */
export class Element{

    /**
     * Unique identifier of element
     */
    private _id: number

    /**
     * Name of element
     */
    private _name: string

    /**
     * Position (index) of element inside of the associated section
     */
    private _pos_index: number

    /**
     * Unique identifier of section the element is part of
     */
    private _section_id: number

    /**
     * Value of element
     */
    private _value: string

    /**
     * Type of element (e.g. password, cleartext, binary file etc.)
     */
    private _type: Types.Element.ElementType


    /**
    * @param id Unique identifier of element
    * @param name Name of element
    * @param value Actual value of element
    * @param type Type of element (e.g. password, cleartext, binary file etc.)
    * @param pos_index Position (index) of element in section
    * @param section_id Unique identifier of section the element is part of
    */
    constructor(id: number, name: string, value: string, type: Types.Element.ElementType, pos_index: number, section_id: number){
        this._name = name
        this._value = value
        this._type = type
        this._id = id
        this._section_id = section_id
        this._pos_index = pos_index
    }
    

    /**
    * Creates a new element
    * @param name Name of new element
    * @param value Value/data of the element (e.g. actual password, binary data etc.)
    * @param type Type of element (e.g. password, cleartext, binary file etc.)
    * @param [transaction] Transaction object for querying
    */
    static async create({name, value, type, section_id, pos_index, transaction} : Params.Element.create): Promise<Element>{
        
        const section = await Section.findById({id: section_id})

        if(section == null) 
            throw new Exception("Section to add element to was not found!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const elements_count = section!.elements.length

        if(!pos_index)
            pos_index = elements_count

        if(pos_index < 0 || pos_index > elements_count)
            throw new Exception("Target position invalid!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

             
        
        return await conn.tx(async (tx)=>{
            transaction = transaction ? transaction : tx
            
            //Prepare section for insertion of new element
            for (const el of section!.elements){
                if(el.pos_index >= pos_index!)
                    await Element.setProperty({id: el.id, property_name:"pos_index", new_value: el.pos_index+1, transaction: transaction})    
            }
            
            //Create new element
            const queryData = [name, value, type, section_id, pos_index]
            const elementData = await transaction.one(elementQueries.create, queryData)

            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)

            // await  Element.setProperty({id: element.id, property_name: "section_id", new_value: id, transaction: transaction})
            // await Element.setProperty({id: element.id, property_name: "pos_index", new_value: pos_index!, transaction: transaction})
        })
    }

    /**
    * Tries to fetch element data of the element with the provided id
    * @param id Unique identifier of element to be returned
    * @returns Instance of a found element or null if no element with provided id was found
    */
    static async findById({id} : Params.Element.findById) : Promise<Element|null>{
        const exists = await this.exists({id: id})
        if(!exists) return null

        try{
            const queryData = [id]
            const elementData = await conn.one(elementQueries.findById, queryData)

            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
        }catch(err: unknown){
            throw new Exception("Failed to find element", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
    * Checks if an element with provided id does exist
    * @param id Unique identifier of element to check existence for
    * @returns true if an element with the provided id was found, else false
    */
    static async exists({id} : Params.Element.exists) : Promise<boolean>{
        try{
            const existsData = await conn.one(elementQueries.exists, [id])
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for existence", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
    * Deletes the element with provided id
    * @param id Unique identifier of element to be deleted
    * @param [transaction] Transaction object for querying 
    */
    static async deleteById({id, transaction} : Params.Element.deleteById) : Promise <void>{
        const element = await Element.findById({id: id})
        if(element == null)
            throw new Exception("Element to deleted does not exist!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)

        try{
            await conn.tx(async (tx)=>{
                transaction = transaction ? transaction : tx

                await Section.removeElement({id: element.section_id, element_id: id, transaction: transaction})
                
                const queryData = [id]
                await transaction!.none(elementQueries.deleteById, queryData)
            })
            
        }catch(err: unknown){
            throw new Exception("Failed to delete element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    
    //#region Getters & Setters
    
    /**
     * 
     * @param param0 
     */
    static async setProperty({id, property_name, new_value, transaction} : Params.setProperty) : Promise<void>{
        if(!propertyNames.includes(property_name))
            throw new Exception("Invalid property name provided!", Types.ExceptionType.ParameterError, HttpStatus.BAD_REQUEST)
        
        const exists = await Element.exists({id: id})
        if(!exists)
            throw new Exception("Unable to find element to change property of!", Types.ExceptionType.ParameterError, HttpStatus.NOT_FOUND)
        
        try{
            
            const queryObject = transaction ? transaction : conn

            const queryString = formatString(elementQueries.setProperty as string, property_name)
            const queryData = [id,  new_value]

            await queryObject.none(queryString, queryData)
        }catch(err: unknown){
            throw new Exception("Failed to change property of element!", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    get id(): number{
        return this._id
    }

    get name(): string{
        return this._name
    }

    get value(): string{
        return this._value
    }

    get type(): Types.Element.ElementType{
        return this._type
    }

    get section_id(): number{
        return this._section_id
    }

    get pos_index(): number{
        return this._pos_index
    }

    //#endregion
}