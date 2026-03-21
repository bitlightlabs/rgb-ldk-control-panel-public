import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function RgbActionPage() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>RGB Asset Transfer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-14 w-full justify-between"
          onClick={() => navigate("/rgb/import")}
        >
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import RGB Asset
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          size="lg"
          variant="secondary"
          className="h-14 w-full justify-between"
          onClick={() => navigate("/rgb/export")}
        >
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Export RGB Asset
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
