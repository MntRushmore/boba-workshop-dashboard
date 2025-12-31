import * as React from "react";

// Minimal utility to merge class names without adding dependencies.
const cn = (...inputs) => inputs.filter(Boolean).join(" ");

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <table ref={ref} className={cn("shad-table", className)} {...props} />
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("shad-table__header", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("shad-table__body", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("shad-table__footer", className)} {...props} />
));
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("shad-table__row", className)} {...props} />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("shad-table__head", className)} {...props} />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("shad-table__cell", className)} {...props} />
));
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("shad-table__caption", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";
