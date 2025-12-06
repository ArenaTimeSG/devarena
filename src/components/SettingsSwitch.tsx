import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SettingsSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SettingsSwitch = ({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false
}: SettingsSwitchProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="space-y-0.5">
        <Label 
          htmlFor={id} 
          className="text-base font-medium cursor-pointer"
        >
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
};

export default SettingsSwitch;


