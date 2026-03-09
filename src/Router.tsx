import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { BaseLayout } from "./components/layouts/BaseLayout";
import { ProjectLayout } from "./components/layouts/ProjectLayout";
import { OrganizationLayout } from "./components/layouts/OrganizationLayout";
import { OverviewPage } from "./components/pages/OverviewPage";
import { OrganizationsPage } from "./components/pages/OrganizationsPage";
import { OrganizationOverviewPage } from "./components/pages/OrganizationOverviewPage";
import { OrganizationProjectsPage } from "./components/pages/OrganizationProjectsPage";
import { OrganizationPeoplePage } from "./components/pages/OrganizationPeoplePage";
import { OrganizationDocsPage } from "./components/pages/OrganizationDocsPage";
import { OrganizationDocDetailsPage } from "./components/pages/OrganizationDocDetailsPage";
import { OrganizationTasksPage } from "./components/pages/OrganizationTasksPage";
import { OrganizationTasksListPage } from "./components/pages/OrganizationTasksListPage";
import { OrganizationTasksBoardPage } from "./components/pages/OrganizationTasksBoardPage";
import { OrganizationTasksArchivePage } from "./components/pages/OrganizationTasksArchivePage";
import { OrganizationSettingsPage } from "./components/pages/OrganizationSettingsPage";
import { TagsPage } from "./components/pages/TagsPage";
import { ProjectOverviewPage } from "./components/pages/ProjectOverviewPage";
import { ProjectTagsPage } from "./components/pages/ProjectTagsPage";
import { ProjectPeoplePage } from "./components/pages/ProjectPeoplePage";
import { ProjectTasksPage } from "./components/pages/ProjectTasksPage";
import { ProjectTasksListPage } from "./components/pages/ProjectTasksListPage";
import { ProjectTasksBoardPage } from "./components/pages/ProjectTasksBoardPage";
import { ProjectTasksArchivePage } from "./components/pages/ProjectTasksArchivePage";
import { ProjectTaskDetailsPage } from "./components/pages/ProjectTaskDetailsPage";
import { ProjectDocsPage } from "./components/pages/ProjectDocsPage";
import { ProjectDocDetailsPage } from "./components/pages/ProjectDocDetailsPage";
import { ProjectTestsPage } from "./components/pages/ProjectTestsPage";
import { ProjectTestDetailsPage } from "./components/pages/ProjectTestDetailsPage";
import { ProjectRequirementsPage } from "./components/pages/ProjectRequirementsPage";
import { ProjectRequirementDetailsPage } from "./components/pages/ProjectRequirementDetailsPage";
import { ProjectTestResultsPage } from "./components/pages/ProjectTestResultsPage";
import { ProjectTestResultDetailsPage } from "./components/pages/ProjectTestResultDetailsPage";
import { ProjectSettingsPage } from "./components/pages/ProjectSettingsPage";
import { NotFoundPage } from "./components/pages/NotFoundPage";

export const Router = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<BaseLayout />}>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                    <Route path="/overview" element={<OverviewPage />} />
                    <Route path="/organizations" element={<OrganizationsPage />} />
                    <Route path="/tags" element={<TagsPage />} />

                    <Route path="/organizations/:orgId" element={<OrganizationLayout />}>
                        <Route index element={<Navigate to="overview" replace />} />
                        <Route path="overview" element={<OrganizationOverviewPage />} />
                        <Route path="projects" element={<OrganizationProjectsPage />} />
                        <Route path="tasks" element={<OrganizationTasksPage />}>
                            <Route index element={<Navigate to="list" replace />} />
                            <Route path="list" element={<OrganizationTasksListPage />} />
                            <Route path="board" element={<OrganizationTasksBoardPage />} />
                            <Route path="archive" element={<OrganizationTasksArchivePage />} />
                        </Route>
                        <Route path="people" element={<OrganizationPeoplePage />} />
                        <Route path="docs" element={<OrganizationDocsPage />} />
                        <Route path="docs/:docId" element={<OrganizationDocDetailsPage />} />
                        <Route path="settings" element={<OrganizationSettingsPage />} />
                    </Route>

                    <Route path="/organizations/:orgId/projects/:projectId" element={<ProjectLayout />}>
                        <Route path="overview" element={<ProjectOverviewPage />} />
                        <Route path="tags" element={<ProjectTagsPage />} />
                        <Route path="people" element={<ProjectPeoplePage />} />
                        <Route path="tasks" element={<ProjectTasksPage />}>
                            <Route index element={<Navigate to="list" replace />} />
                            <Route path="list" element={<ProjectTasksListPage />} />
                            <Route path="board" element={<ProjectTasksBoardPage />} />
                            <Route path="archive" element={<ProjectTasksArchivePage />} />
                        </Route>
                        <Route path="tasks/:taskId" element={<ProjectTaskDetailsPage />} />
                        <Route path="docs" element={<ProjectDocsPage />} />
                        <Route path="docs/:docId" element={<ProjectDocDetailsPage />} />
                        <Route path="tests" element={<ProjectTestsPage />} />
                        <Route path="tests/:testId" element={<ProjectTestDetailsPage />} />
                        <Route path="requirements" element={<ProjectRequirementsPage />} />
                        <Route path="requirements/:requirementId" element={<ProjectRequirementDetailsPage />} />
                        <Route path="test-results" element={<ProjectTestResultsPage />} />
                        <Route path="test-results/:testResultId" element={<ProjectTestResultDetailsPage />} />
                        <Route path="settings" element={<ProjectSettingsPage />} />
                    </Route>
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};