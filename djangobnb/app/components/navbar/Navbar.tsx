import Image from 'next/image';
import Link from 'next/link';

import SearchFilters from './SearchFilters';
import UserNav from './UserNav';
import {getUserId} from '@/app/lib/actions';
import AddPropertyButton from './AddPropertyButton';

const Navbar = async () => {
    const userId = await getUserId();

    console.log('userId:', userId);

    return (
        <nav className="w-full fixed top-0 left-0 py-4 border-b bg-white z-10">
            <div className="max-w-[1500px] mx-auto px-8">
                <div className="flex justify-between items-center">
                    <Link
                        className="flex items-center flex-shrink-2"
                        href="/"
                    >
                        <div className="relative h-[40px] w-[40px] ">
                            <Image
                                className="relative w-[180px] h-[38px]"
                                src="/logo.png"
                                alt="DjangoBnb logo"
                                layout="fill"
                                objectFit="contain"
                                sizes="100vw"
                                priority
                            />
                        </div>
                        <span className="pl-2 text-airbnb hidden sm:inline font-bold text-xl">djangobnb</span>
                    </Link>

                    <div className="flex sm:space-x-6">
                        <SearchFilters/>
                    </div>

                    <div className="flex sm:space-x-6">
                        <AddPropertyButton
                            userId={userId}
                        />

                        <UserNav
                            userId={userId}
                        />
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;