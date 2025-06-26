// src/components/Footer.tsx
export default function Footer() {
    return (
        <footer className="bg-white border-t border-neutral-light text-center text-sm text-neutral py-4">
            © {new Date().getFullYear()} Promethos. All rights reserved.
        </footer>
    );
}
