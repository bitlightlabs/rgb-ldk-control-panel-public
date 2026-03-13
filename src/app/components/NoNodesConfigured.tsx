import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  hasConfiguredNodes: boolean;
  onGoNodes?: () => void;
  children: ReactNode;
}

class NoNodesConfigured extends Component<Props> {
  public render() {
    if (!this.props.hasConfiguredNodes) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">No nodes configured</CardTitle>
            <CardDescription>
              Add at least one node context before using wallet/business pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {this.props.onGoNodes ? (
              <Button type="button" onClick={this.props.onGoNodes}>
                Go To Nodes
              </Button>
            ) : null}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default NoNodesConfigured;

