'use server'
import { prisma } from "@/shared/lib";

interface updateUserCityProps {
    newCityId: string,
    userId: string
}
export async function updateUserCity({newCityId, userId}: updateUserCityProps){
    try {
        const updateUser = await prisma.user.update({
            where: {
                id: userId
            }, 
            data: {
                cityId:newCityId
            }
        })
        if(updateUser){
            return { success: true }
        }
    } catch(error: unknown){
        if(process.env.NODE_ENV === 'development'){
            console.log(`Error updating user city: ${error}`)
        } 
        throw new Error(`Error updating user data`)
    }
}