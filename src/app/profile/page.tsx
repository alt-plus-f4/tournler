import { signIn } from 'next-auth/react';
import { getAuthSession } from '@/lib/auth';
import Image from 'next/image';

const Profile = async () => {
    const session = await getAuthSession();

    const discordName = session?.user?.discordName;
    const discordImage = session?.user?.discordImage;

    const handleLinkDiscord = () => {
        signIn('discord');
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
            <h1 className="text-2xl font-bold">Welcome, {session?.user?.name}</h1>
            <p className="text-gray-700">Email: {session?.user?.email}</p>

            {discordName ? (
                <div className="mt-4">
                    <p className="text-gray-700">Discord Name: {discordName}</p>
                    {discordImage && (
                        <Image
                            src={discordImage}
                            alt="Discord Avatar"
                            className="rounded-full mt-2"
                            width={64}
                            height={64}
                        />
                    )}
                </div>
            ) : (
                <div className="mt-4">
                    <p className="text-gray-500 mb-2">Link your Discord account for additional features:</p>
                    <button
                        onClick={handleLinkDiscord}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold"
                    >
                        Link Discord Account
                    </button>
                </div>
            )}
        </div>
    );
};

export default Profile;