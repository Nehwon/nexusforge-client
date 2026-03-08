import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }
>;

export default function Button({ children, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={`button ${variant === 'secondary' ? 'secondary' : ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
