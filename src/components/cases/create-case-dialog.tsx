"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DemoBadge } from "@/components/common/demo-badge";
import { useToast } from "@/components/common/toast";
import { useDemoCases, type NewCaseInput } from "@/hooks/use-demo-cases";
import {
  CASE_CATEGORIES,
  CASE_PRIORITIES,
  CURRENCIES,
} from "@/lib/types";

type FieldName = keyof NewCaseInput;

type Errors = Partial<Record<FieldName, string>>;

const EMPTY_FORM = {
  title: "",
  customer: "",
  merchant: "",
  category: CASE_CATEGORIES[0] as string,
  description: "",
  amount: "",
  currency: CURRENCIES[0] as string,
  priority: CASE_PRIORITIES[1] as string,
};

type FormState = typeof EMPTY_FORM;

function validate(form: FormState): Errors {
  const errors: Errors = {};

  if (!form.title.trim()) errors.title = "Case title is required.";
  if (!form.customer.trim()) errors.customer = "Customer name is required.";
  if (!form.merchant.trim()) errors.merchant = "Merchant name is required.";
  if (!form.description.trim()) {
    errors.description = "Describe the complaint so it can be triaged.";
  } else if (form.description.trim().length < 12) {
    errors.description = "Add a little more detail (at least 12 characters).";
  }

  const amount = Number(form.amount);
  if (!form.amount.trim()) {
    errors.amount = "Order amount is required.";
  } else if (Number.isNaN(amount)) {
    errors.amount = "Enter a valid number.";
  } else if (amount <= 0) {
    errors.amount = "Amount must be greater than zero.";
  }

  if (!form.category) errors.category = "Select a complaint category.";
  if (!form.currency) errors.currency = "Select a currency.";
  if (!form.priority) errors.priority = "Select a priority.";

  return errors;
}

const FIELD_ORDER: FieldName[] = [
  "title",
  "customer",
  "merchant",
  "category",
  "description",
  "amount",
  "currency",
  "priority",
];

/**
 * Create Case — a genuinely working interaction backed by local React state.
 * The resulting record is explicitly labelled temporary; nothing is persisted
 * and no network request is made.
 */
export function CreateCaseAction({
  size = "md",
  variant = "primary",
  label = "Create Case",
  className,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const { createCase } = useDemoCases();
  const { toast } = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const set = (name: FieldName, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const close = () => {
    setOpen(false);
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      // Move focus to the first field that failed.
      const firstInvalid = FIELD_ORDER.find((name) => found[name]);
      if (firstInvalid) {
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
          ?.focus();
      }
      return;
    }

    const created = createCase({
      title: form.title.trim(),
      customer: form.customer.trim(),
      merchant: form.merchant.trim(),
      category: form.category as NewCaseInput["category"],
      description: form.description.trim(),
      amount: Number(form.amount),
      currency: form.currency as NewCaseInput["currency"],
      priority: form.priority as NewCaseInput["priority"],
    });

    setForm(EMPTY_FORM);
    setOpen(false);

    toast({
      tone: "success",
      title: `Case ${created.id} created`,
      description:
        "Stored in memory only — this demonstration case is lost on reload.",
    });

    router.push(`/cases/${created.id}`);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        icon={<Plus className="h-4 w-4" aria-hidden="true" />}
        className={className}
      >
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        title="Create a new case"
        description="Record a buyer complaint so evidence and responses can be organised."
        size="lg"
        bodyClassName="max-h-[min(58vh,520px)] overflow-y-auto overscroll-contain"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" form="create-case-form">
              Create case
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-md border border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_8%,transparent)] px-3.5 py-2.5">
          <DemoBadge size="xs" />
          <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-[#d8c79a]">
            New cases are held in browser memory for this session only. Backend
            persistence arrives in a later phase.
          </p>
        </div>

        <form
          id="create-case-form"
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field
            label="Case title"
            htmlFor="title"
            required
            error={errors.title}
            className="sm:col-span-2"
          >
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
              invalid={Boolean(errors.title)}
              placeholder="e.g. Wrong product received"
              autoComplete="off"
            />
          </Field>

          <Field label="Customer name" htmlFor="customer" required error={errors.customer}>
            <Input
              id="customer"
              name="customer"
              value={form.customer}
              onChange={(event) => set("customer", event.target.value)}
              invalid={Boolean(errors.customer)}
              placeholder="e.g. Alex Morgan"
              autoComplete="off"
            />
          </Field>

          <Field label="Merchant name" htmlFor="merchant" required error={errors.merchant}>
            <Input
              id="merchant"
              name="merchant"
              value={form.merchant}
              onChange={(event) => set("merchant", event.target.value)}
              invalid={Boolean(errors.merchant)}
              placeholder="e.g. TechStore"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Complaint category"
            htmlFor="category"
            required
            error={errors.category}
          >
            <Select
              id="category"
              name="category"
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
            >
              {CASE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="priority" required error={errors.priority}>
            <Select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={(event) => set("priority", event.target.value)}
            >
              {CASE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-[1fr_auto] gap-3 sm:col-span-2">
            <Field label="Order amount" htmlFor="amount" required error={errors.amount}>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => set("amount", event.target.value)}
                invalid={Boolean(errors.amount)}
                placeholder="0.00"
                className="rg-tabular"
                autoComplete="off"
              />
            </Field>

            <Field label="Currency" htmlFor="currency" required error={errors.currency}>
              <Select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={(event) => set("currency", event.target.value)}
                className="w-[104px]"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="description"
            required
            error={errors.description}
            hint="What happened, what was ordered and what arrived."
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
              invalid={Boolean(errors.description)}
              placeholder="Describe the complaint in your own words…"
              rows={4}
            />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
