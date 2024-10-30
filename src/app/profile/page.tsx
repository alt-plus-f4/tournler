import { getAuthSession } from '@/lib/auth';

const Profile = async () => {
    const session = await getAuthSession();

    const handleLinkDiscord = async () => {
        try {
            const response = await fetch("/api/discord/join-server", {
                method: "POST",
            });

            if (response.ok) {
                alert("Discord account linked and server joined!");
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            console.error(error);
            alert("An unexpected error occurred");
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
            <h1 className="text-2xl font-bold">Welcome, {session?.user?.name}</h1>
            <p className="text-gray-700">Email: {session?.user?.email}</p>

            <h2>Profile Page</h2>
            <button onClick={handleLinkDiscord}>
                Link Discord & Join Server
            </button>
        </div>
    );
};

export default Profile;