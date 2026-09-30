import * as Dialog from "@radix-ui/react-dialog";
import { keyLabel, SHORTCUT_GROUPS, SHORTCUTS } from "../shortcuts/registry";
import { IconButton } from "./Button";
import { CloseIcon, ICON_SIZE_INLINE } from "./icons";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Every registered shortcut, grouped. Radix returns focus to where it was on
 *  close. */
export default function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby={undefined}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-hair">
            <Dialog.Title className="text-[13px] text-text flex-1">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton compact title="Close" aria-label="Close">
                <CloseIcon size={ICON_SIZE_INLINE} />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-4 px-4 py-3">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group}>
                <h3 className="text-[11px] text-faint mb-1.5">{group}</h3>
                <dl className="flex flex-col gap-1.5">
                  {SHORTCUTS.filter((s) => s.group === group).map((shortcut) => (
                    <div key={shortcut.id} className="flex items-center gap-3">
                      <dt className="flex-1 text-xs text-text">{shortcut.description}</dt>
                      <dd className="flex items-center gap-1">
                        {shortcut.keys.map((key) => (
                          <kbd key={key} className="key-cap">
                            {keyLabel(key)}
                          </kbd>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
