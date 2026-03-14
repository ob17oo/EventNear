import { getAllCities } from "@/entities/city/api"
import { authOption } from "@/shared/lib/auth"
import { Category, HeaderComp } from "@/widgets"
import { getServerSession } from "next-auth"

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await getServerSession(authOption)
    const city = await getAllCities()
    return (
        <>
            <HeaderComp city={city} session={session}/>
            <Category />
            {children}
        </>
    )
}