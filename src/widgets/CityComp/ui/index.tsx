import { TUserCity } from "@/entities/city/model/city.types"
import { updateUserCity } from "@/entities/user/lib";
import { InputComp } from "@/shared/ui";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface CityPopUpProps {
    isOpen: boolean,
    onClose: () => void,
    city: TUserCity[],
    userCity: TUserCity;
}
export function CityDialogComp({isOpen, onClose, city, userCity}:CityPopUpProps){
    const router = useRouter()
    const {data: session, update} = useSession()
    const [search, setSearch] = useState('')
    
    const filteredCity = useMemo(() => {
        if(!search.trim()) return city
        return city.filter((el) => el.name.toLowerCase().includes(search.toLowerCase()))
    },[city, search])

    if(!session || !isOpen){
        return null
    }
    
    const handleChangeCity = async (selectedCity: string) => {
        if(selectedCity === userCity.id){
            onClose()
            return
        }

        try {
            const resp = await updateUserCity({
                newCityId: selectedCity,
                userId: session.user.id
            })

            if(resp?.success){
                await update()
                onClose()
                router.refresh()
            }

        } catch(error: unknown){
            console.log(`Error updating user data: ${error}`)
            throw new Error(`Eror updating data`)
        }
    }

    return (
        <section className="w-full h-screen fixed inset-0 z-20 bg-black/30" onClick={onClose}>
            <div className="w-full h-full flex items-center justify-center">
                <div onClick={(e) => e.stopPropagation()} className="rounded-2xl min-w-20 w-80 px-4 pt-8 pb-4 bg-gray-100 flex flex-col gap-3 relative">
                    <button onClick={onClose} className="absolute top-2 right-2 cursor-pointer" type="button">
                        <Image width={28} height={28} src={'/static/icons/close-cross_accent.svg'} alt="CloseCity"/>
                    </button>
                    <div className="flex items-center gap-1">
                        <Image width={28} height={28} src={'/static/icons/map-location_accent.svg'} alt="UserCityPointer"/>
                        <p className="text-lg">{userCity.name}</p>
                    </div>
                    <InputComp value={search} onChange={(e) => setSearch(e.target.value)} label='Поиск города'/>
                    <div className="flex flex-col gap-3 h-80 overflow-scroll ">
                        { filteredCity.map((el) => (
                            <button onClick={() => handleChangeCity(el.id)} className="text-lg text-left cursor-pointer" key={el.id} type="button">
                                {el.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}