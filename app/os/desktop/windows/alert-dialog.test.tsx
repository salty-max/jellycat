import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AlertDialog } from "./alert-dialog";

function Harness({ onSelect }: { onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Shut down</button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Shut down Jelly-OS?"
        actions={[{ label: "Cancel" }, { label: "Shut Down", default: true, onSelect }]}
      />
    </>
  );
}

describe("AlertDialog", () => {
  it("is an alert dialog named by its message, with focus on the default button", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Shut down" }));
    expect(await screen.findByRole("alertdialog", { name: "Shut down Jelly-OS?" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Shut Down" })).toHaveFocus());
    expect(screen.getByRole("button", { name: "Shut Down" })).toHaveAttribute("data-default");
  });
  it("Enter presses the default button, which closes the dialog and gives focus back to the opener", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Shut down" }));
    await screen.findByRole("alertdialog");
    await waitFor(() => expect(screen.getByRole("button", { name: "Shut Down" })).toHaveFocus());
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByRole("button", { name: "Shut down" })).toHaveFocus();
  });
  it("Cancel closes without selecting, and a click outside does not close it", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Shut down" }));
    await screen.findByRole("alertdialog");
    await user.click(document.body);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onSelect).not.toHaveBeenCalled();
  });
});
