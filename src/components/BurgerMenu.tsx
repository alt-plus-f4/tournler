"use client";

import { useState } from 'react';
import { FaBars } from "react-icons/fa";

export function BurgerMenu({
    className,
    ...props
}: React.HTMLAttributes<HTMLElement>) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    }

    return (
        <div
            className={className}
            {...props}
        >
            <button onClick={toggleMenu} className={`burger-menu ${isOpen ? 'active' : ''}`}>
                <FaBars />
            </button>

            {/* <div className={`center-nav ${isOpen ? 'active' : ''}`}>
                <Link href="/">Home</Link>
                <Link href="/projects">Personal Projects</Link>
                <Link href="/accomplishments">Accomplishments</Link>
            </div> */}
        </div>
    )
}