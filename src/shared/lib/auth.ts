import Credentials from "next-auth/providers/credentials";
import z from "zod";
import { emailSchema } from "../schema/email.schema";
import { passwordSchema } from "../schema/password.schema";
import { prisma } from "./prisma";
import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";

const credentialsSchema = z.object({
    email: emailSchema,
    password: passwordSchema
})

export const authOption: NextAuthOptions = {
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60,
    },
    pages: {
        signIn: '/login',
        signOut: '/signout',
        newUser: '/register'
    },
    providers: [
        Credentials({
            name: 'Credentials',
            credentials: {
                email: {
                    label: 'email',
                    type: 'email',
                    placeholder: 'your@email.com'
                },
                password: {
                    label: 'password',
                    type: 'password',
                    placeholder: '********'
                }
            },
            async authorize(credentials){
                try {
                    if(!credentials?.email || !credentials.password){
                        throw new Error(`EMAIL_OR_PASSWORD_REQUIRED`)
                    }

                    const validateResult = credentialsSchema.safeParse({
                        email: credentials.email,
                        password: credentials.password
                    })

                    if(!validateResult.success){
                        const error = validateResult.error.issues
                        const errorMessage = Object.values(error)
                            .flat()
                            .join(', ')
                        throw new Error(`VALIDATION_ERROR: ${errorMessage}`)
                    }

                    const { email,password } = validateResult.data

                    const user = await prisma.user.findUnique({
                        where: {
                            email
                        },
                        select: {
                            id: true,
                            userName: true,
                            password: true,
                            imageUrl: true,
                            email: true,
                            role: true,
                            cityId: true,
                            city: true
                        }
                    })

                    if(!user){
                        throw new Error(`USER_NOT_FOUND`)
                    }

                    if(!user.password){
                        throw new Error(`PASSWORD_NOT_SET`)
                    }

                    const isPasswordValid = await compare(password, user.password)
                    if(!isPasswordValid) {
                        throw new Error(`INVALID_PASSWORD`)
                    }

                    return user
                } catch(error: unknown){
                    if(process.env.NODE_ENV === 'development') {
                        console.log(`Error authorization: ${error}`)
                    }

                    if(error instanceof Error){
                        const errorMap: Record<string, string> = {
                            'EMAIL_PASSWORD_REQUIRED': 'Email и пароль обязательны',
                            'USER_NOT_FOUND': 'Пользователь не найден',
                            'PASSWORD_NOT_SET': 'Пароль не установлен',
                            'INVALID_PASSWORD': 'Неверный пароль',
                        }
                        const errorCode = error.message.split(':')[0]
                        const userErrorMessage = errorMap[errorCode] || error.message

                        throw new Error(`AUTHORIZATION_ERROR: ${userErrorMessage}`)
                    }
                    throw new Error(`UNEXPECTED_AUTH_ERROR`)
                }        
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, session, trigger }){
            if(user){
                token.id = user.id;
                token.userName = user.userName;
                token.email = user.email;
                token.imageUrl = user.imageUrl;
                token.role = user.role;
                token.cityId = user.cityId;
                token.city = user.city;
            }    
            
            if(trigger === 'update'){
                try {
                    const updateDataUser = await prisma.user.findUnique({
                        where: {
                            id: token.id
                        },
                        select: {
                            userName: true,
                            email: true,
                            imageUrl: true,
                            role: true,
                            cityId: true,
                            city: true
                        }
                    })

                    if(updateDataUser){
                        token.userName = updateDataUser.userName
                        token.email = updateDataUser.email
                        token.imageUrl = updateDataUser.imageUrl
                        token.role = updateDataUser.role
                        token.cityId = updateDataUser.cityId
                        token.city = updateDataUser.city
                    }

                } catch(error: unknown){
                    if(process.env.NODE_ENV === 'development'){
                        console.log(`Error update JWT token: ${error}`)
                    }
                    throw new Error(`Error updating JWT data`)
                }
            }

            if(session?.user){
                token.userName = session.userName
                token.email = session.email
                token.imageUrl = session.imageUrl
                token.role = session.role
                token.cityId = session.cityId
                token.city = session.city
            }
            
            return token;
        },

        async session({token,session}){
            if(token && session.user){
                session.user.id = token.id
                session.user.userName = token.userName
                session.user.email = token.email
                session.user.imageUrl = token.imageUrl
                session.user.role = token.role
                session.user.cityId = token.cityId
                session.user.city = token.city
            }
            return session
        }
    },
    events: {
        async signIn({user,isNewUser}){
            console.log(`User is signed in`, {
                userId: user.id,
                email: user.email,
                isNewUser
            })
        },
        async signOut({token}){
            console.log(`User is signed out`, {
                userId: token.id
            })
        },
        async createUser({user}){
            console.log(`New user created`, {
                userId: user.id,
                email: user.email
            })
        }
    },
    cookies: {
        sessionToken: {
            name: 'next-auth.session-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60
            }
        },
        callbackUrl: {
            name: 'next-auth.callback-url',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60
            }
        },
        csrfToken: {
            name: 'next-auth.csrf-token',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60
            }
        },
    },
    debug: process.env.NODE_ENV === 'development',
    secret: process.env.AUTH_SECRET
}