using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Consultorio.Infra.Migrations
{
    /// <inheritdoc />
    public partial class AddClinicIdToInsurancePlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Add as nullable so the table can be backfilled before tightening the constraint.
            migrationBuilder.AddColumn<Guid>(
                name: "ClinicId",
                table: "InsurancePlans",
                type: "uniqueidentifier",
                nullable: true);

            // 2) Backfill any pre-existing rows with the first active clinic. Production
            //    systems running before this migration treated InsurancePlans as global,
            //    so anything currently stored belongs to whatever the only clinic is.
            migrationBuilder.Sql(@"
                UPDATE ip
                SET ip.ClinicId = (SELECT TOP 1 c.Id FROM Clinics c WHERE c.IsActive = 1 ORDER BY c.CreatedAt)
                FROM InsurancePlans ip
                WHERE ip.ClinicId IS NULL;
            ");

            // 3) Drop any rows that still have no clinic (no clinic existed yet).
            migrationBuilder.Sql("DELETE FROM InsurancePlans WHERE ClinicId IS NULL;");

            // 4) Promote to NOT NULL.
            migrationBuilder.AlterColumn<Guid>(
                name: "ClinicId",
                table: "InsurancePlans",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_InsurancePlans_ClinicId_Name",
                table: "InsurancePlans",
                columns: new[] { "ClinicId", "Name" });

            migrationBuilder.AddForeignKey(
                name: "FK_InsurancePlans_Clinics_ClinicId",
                table: "InsurancePlans",
                column: "ClinicId",
                principalTable: "Clinics",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InsurancePlans_Clinics_ClinicId",
                table: "InsurancePlans");

            migrationBuilder.DropIndex(
                name: "IX_InsurancePlans_ClinicId_Name",
                table: "InsurancePlans");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                table: "InsurancePlans");
        }
    }
}
