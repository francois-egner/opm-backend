
import { Exception } from "../Utils/Exception"
import HttpStatus from 'http-status-codes'
import { connection as conn, elementQueries } from "../../Sql"
import { Section } from "../Wrappers/Section"
import { formatString } from "../Utils/Shared"


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
     * Position (index) of element in section
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
     * Type of element (e.g. password, cleartext etc.)
     */
    private _type: Types.Element.ElementType


    /**
    * @param id Unique identifier of element
    * @param name Name of new element
    * @param value Actual value of new element
    * @param type Type of element (e.g. password, cleartext etc.)
    * @param pos_index Position (index) of element in section
    * @param section_id Unique identifier of section the new element will be part of
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
    * Creates a new element with the provided properties 
    * @param name Name of new element
    * @param value Actual value of new element
    * @param type Type of element (e.g. password, cleartext etc.)
    * @param connection Task/Transaction for querying
    */
    static async create({name, value, type, transaction} : Types.Element.Params.create): Promise<Element>{
        
        try{
            const queryObject = transaction ? transaction : conn

            const queryData = [name,value, type]
            const elementData = await queryObject.one(elementQueries.create, queryData)
            return new Element(elementData.id, elementData.name, elementData.value, elementData.type, elementData.pos_index, elementData.section_id)
        }catch(err: unknown){
            throw new Exception("Failed to create new element", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        } 
    }

    /**
    * Tries to fetch the element with the provided unique identifier
    * @param id Unique identifier of element to be found 
    */
    static async findById({id} : Types.Element.Params.findById): Promise<Element|null>{
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
    * Checks for existence of an element with the provided unique identifier
    * @param id Unique identifier to check existence for 
    * @returns true if an element with the provided id was found, else false
    */
    static async exists({id}: Types.Element.Params.exists): Promise<boolean>{
        try{
            const existsData = await conn.one(elementQueries.exists, [id])
            return existsData.exists
        }catch(err: unknown){
            throw new Exception("Failed to check for existence", Types.ExceptionType.SQLError, HttpStatus.INTERNAL_SERVER_ERROR, err as Error)
        }
    }

    /**
    * Deletes the element with provided unique identifier
    * @param id Unique identifier of element to be deleted
    * @param connection Connection/Transaction for queyring
    */
    static async deleteById({id, transaction} : Types.Element.Params.deleteById): Promise <void>{
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


    static async setProperty({id, property_name, new_value, transaction}: Types.Params.setProperty):Promise<void>{
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