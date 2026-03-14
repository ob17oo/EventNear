'use client'
import { TUserCity } from "@/entities/city/model/city.types";
import { useLockScroll } from "@/shared/hooks/useLockScroll";
import { InputComp } from "@/shared/ui";
import { CityDialogComp } from "@/widgets/CityComp/ui";
import { MenuDialogComp } from "@/widgets/MenuComp/ui";
import { Session } from "next-auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderCompProps{
    session: Session | null
    city: TUserCity[];
}

export function HeaderComp({session, city}:HeaderCompProps){
    const router = useRouter()
    const [isOpenMenu, setIsOpenMenu] = useState(false)
    const [isOpenCityPicker, setIsOpenCityPicker] = useState(false)

    useLockScroll(isOpenCityPicker)

    const user = session?.user
    return (
        <header className="w-full h-25.5 relative">
            <div className="h-full flex items-center justify-between gap-10">
                <div className="w-fit">
                    <Image width={250} height={100} src={'/static/icons/AnubisLogotype.svg'} alt="HeaderLogotype"/>
                </div>
                <div className="w-full flex items-center justify-between">
                    <div className="max-w-90 w-full">
                        <InputComp label="Поиск" icon="/static/icons/search.svg"/>
                    </div>
                    { user && (
                        <div className="flex items-center gap-6">
                            <button onClick={() => setIsOpenCityPicker(true)} className="flex items-center gap-1.5 cursor-pointer">
                                <Image width={28} height={28} src={'/static/icons/map-location.svg'} alt="City-Pointer"/>
                                <span className="text-lg">{user?.city.name}</span>
                            </button>

                            <CityDialogComp userCity={user.city} city={city} isOpen={isOpenCityPicker} onClose={() => setIsOpenCityPicker(false)}/>

                            <button onClick={() => router.push('/order')} className="flex items-center gap-1.5 cursor-pointer">
                                <Image width={28} height={28} src={'/static/icons/ticket.svg'} alt="Header-Ticket"/>
                                <span className="text-lg">Мои билеты</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="w-fit">
                    <button onClick={() => setIsOpenMenu(true)} type="button" className="cursor-pointer">
                        <Image width={56} height={56} src={session?.user.imageUrl || '/static/default/default-user.svg'} alt="HeaderUserAvatar"/>
                    </button>
                    <MenuDialogComp isOpen={isOpenMenu} onClose={() => setIsOpenMenu(false)}/>
                </div>
            </div>
        </header>
    )
}