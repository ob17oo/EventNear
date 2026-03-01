'use client'
import Link from "next/link";
import { HEADER_CATEGORY } from "../model/category.constant";
import { usePathname } from "next/navigation";

export function Category(){
    const currentPath = usePathname()
    return (
        <div className="flex items-center gap-8 w-full h-15">
            { HEADER_CATEGORY.map((element) => (
                <Link className={`text-xl px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-200 transition-all duration-300 ease-in-out ${element.path === currentPath ? 'bg-gray-200' : 'bg-transparent'}`} key={element.value} href={element.path}>{element.value}</Link>
            ))}
        </div>
    )
}