import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';
import { classNames } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ title, children, padding = 'md', className, ...props }: CardProps) {
  return (
    <div className={classNames(styles.card, styles[`padding-${padding}`], className)} {...props}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
