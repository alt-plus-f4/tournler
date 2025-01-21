import {
	ChevronDown,
	Code,
	Users,
	Calendar,
	Layout,
	Shield,
	Zap,
} from 'lucide-react';
import Image from 'next/image';

interface AccordionItemProps {
	title: string;
	content: React.ReactNode;
	icon: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
	title,
	content,
	icon,
}) => (
	<details className='group border-b border-gray-200 dark:border-gray-700'>
		<summary className='flex items-center justify-between w-full p-5 text-left cursor-pointer'>
			<div className='flex items-center'>
				{icon}
				<span className='ml-3 text-lg font-medium text-gray-900 dark:text-white'>
					{title}
				</span>
			</div>
			<ChevronDown className='w-5 h-5 text-gray-500 transition-transform duration-200 group-open:rotate-180' />
		</summary>
		<div className='p-5'>{content}</div>
	</details>
);

export default function EnhancedTournamentManagementSystemInfo() {
	return (
		<div className='min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'>
			<div className='container mx-auto px-4 py-12'>
				<div className='max-w-3xl mx-auto'>
					<div className='text-center mb-12'>
						<h1 className='text-4xl font-bold mb-4'>
							Tournament Management System
						</h1>
						<p className='text-xl text-gray-600 dark:text-gray-400'>
							A comprehensive platform for organizing and managing
							esports tournaments
						</p>
					</div>

					<Image
						src='/placeholder.svg?height=300&width=800'
						alt='Tournament Management System Dashboard'
						width={800}
						height={300}
						className='rounded-lg shadow-lg mb-12'
					/>

					<div className='space-y-4'>
						<AccordionItem
							title='Key Features'
							icon={<Zap className='w-6 h-6 text-blue-500' />}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>Tournament Management:</strong>{' '}
										Create, edit, and manage tournaments,
										including bracket management and score
										updates.
									</li>
									<li>
										<strong>Team Features:</strong> Team
										registration, player roster management,
										and match history tracking.
									</li>
									<li>
										<strong>Match System:</strong> Live
										scoring, match scheduling, and results
										tracking.
									</li>
									<li>
										<strong>User Interface:</strong>{' '}
										Responsive design with a dark theme and
										interactive tournament brackets.
									</li>
									<li>
										<strong>Admin Panel</strong> Create,
										edit and manage tournaments, teams, and
										users.
									</li>
								</ul>
							}
						/>

						<AccordionItem
							title='Tech Stack'
							icon={<Code className='w-6 h-6 text-green-500' />}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>Next.js:</strong> React
										framework for building the web
										application, providing server-side
										rendering and routing.
									</li>
									<li>
										<strong>TypeScript:</strong> Adds static
										typing to JavaScript, enhancing code
										quality and developer experience.
									</li>
									<li>
										<strong>Tailwind CSS:</strong>{' '}
										Utility-first CSS framework for rapid UI
										development.
									</li>
									<li>
										<strong>Prisma:</strong> Next-generation
										ORM for Node.js and TypeScript.
									</li>
									<li>
										<strong>Convex:</strong> Full-stack data
										platform for building reactive
										applications.
									</li>
								</ul>
							}
						/>

						<AccordionItem
							title='User and Team Management'
							icon={<Users className='w-6 h-6 text-purple-500' />}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>User Profiles:</strong>{' '}
										Customizable user profiles with avatars
										and nicknames.
									</li>
									<li>
										<strong>
											Team Creation and Management:
										</strong>{' '}
										Users can create and manage teams,
										including inviting other players.
									</li>
									<li>
										<strong>Onboarding Process:</strong>{' '}
										Guided onboarding for new users to set
										up their profiles and preferences.
									</li>
									<li>
										<strong>Admin Controls:</strong>{' '}
										Comprehensive admin panel for managing
										users, teams, and tournaments.
									</li>
								</ul>
							}
						/>

						<AccordionItem
							title='Tournament Features'
							icon={<Calendar className='w-6 h-6 text-red-500' />}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>Bracket Management:</strong>{' '}
										Create and manage tournament brackets
										with ease.
									</li>
									<li>
										<strong>Live Scoring:</strong> Real-time
										updates for ongoing matches.
									</li>
									<li>
										<strong>Match Scheduling:</strong>{' '}
										Efficient tools for organizing and
										displaying match schedules.
									</li>
									<li>
										<strong>Results Tracking:</strong>{' '}
										Comprehensive system for recording and
										displaying tournament results.
									</li>
								</ul>
							}
						/>

						<AccordionItem
							title='User Interface'
							icon={
								<Layout className='w-6 h-6 text-yellow-500' />
							}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>Responsive Design:</strong>{' '}
										Ensures the platform is accessible on
										various devices and screen sizes.
									</li>
									<li>
										<strong>Interactive Brackets:</strong>{' '}
										Provides an engaging way to view and
										interact with tournament progress.
									</li>
								</ul>
							}
						/>

						<AccordionItem
							title='Security and Integration'
							icon={
								<Shield className='w-6 h-6 text-indigo-500' />
							}
							content={
								<ul className='list-disc pl-5 space-y-2'>
									<li>
										<strong>Authentication:</strong> Secure
										user authentication with support for
										multiple providers (e.g., Steam,
										Discord).
									</li>
									<li>
										<strong>API Endpoints:</strong>{' '}
										Comprehensive API for integrating with
										other services or building additional
										features.
									</li>
									<li>
										<strong>Data Protection:</strong> Robust
										measures to ensure user data privacy and
										security.
									</li>
									<li>
										<strong>
											Third-party Integrations:
										</strong>{' '}
										Seamless integration with popular gaming
										platforms and services.
									</li>
								</ul>
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
