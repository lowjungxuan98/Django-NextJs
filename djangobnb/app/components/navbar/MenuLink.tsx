'use client';

interface MenuLinkProps {
    label: string;
    onClick: () => void;
}

const MenuLink: React.FC<MenuLinkProps> = ({
    label,
    onClick
}) => {
    return (
        <div 
            onClick={onClick}
            className="z-50 cursor-pointer px-5 py-4 bg-white hover:bg-gray-100 transition hover:text-airbnbDark relative"
        >
            {label}
        </div>
    )
}

export default MenuLink;