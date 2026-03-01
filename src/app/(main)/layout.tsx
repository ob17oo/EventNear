import { Category, HeaderComp } from "@/widgets"

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            <HeaderComp />
            <Category />
            {children}
        </>
    )
}