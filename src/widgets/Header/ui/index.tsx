
import { InputComp } from "@/shared/ui";
import Image from "next/image";

export function HeaderComp(){
    return (
        <header className="w-full h-22.5">
            <div className="h-full flex items-center justify-between gap-10">
                <div className="w-fit flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF5100]"></div>
                    <h2 className="text-4xl text-[#FF5100] font-bold">Anubis</h2>
                </div>
                <div className="w-full flex items-center justify-between">
                    <div className="max-w-90 w-full">
                        <InputComp value="Поиск" icon="/static/icons/search.svg"/>
                    </div>
                    <div className="flex items-center gap-6">
                        <button className="flex items-center gap-1.5 cursor-pointer">
                            <Image width={28} height={28} src={'/static/icons/map-location.svg'} alt="City-Pointer"/>
                            <span className="text-lg">Ростов-на-Дону</span>
                        </button>
                        <button className="flex items-center gap-1.5 cursor-pointer">
                            <Image width={28} height={28} src={'/static/icons/ticket.svg'} alt="Header-Ticket"/>
                            <span className="text-lg">Мои билеты</span>
                        </button>
                    </div>
                </div>
                <div className="w-fit">
                    <button type="button" className="cursor-pointer">
                        <div className="w-14 h-14 rounded-full bg-[#FF5100]"></div>
                    </button>
                </div>
            </div>
        </header>
    )
}