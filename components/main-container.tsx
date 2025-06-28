export const MainContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container-responsive pt-[120px]">
      {children}
    </div>
  );
};